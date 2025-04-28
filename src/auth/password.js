import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as User from '../services/userService.js';
import { sendVerifyEmail } from '../mail/resend.js';
import { signEmailToken, verifyEmailToken } from './jwt.js';
import { pool } from '../db/index.js';
import { decrypt } from './cryptoUtils.js';
import { verifyBackupCode } from './backupCodes.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import { validateUsername } from '../utils/usernamePolicy.js';
import { PUBLIC_BASE_URL } from '../config/env.js';
import { signAccessToken } from './jwt.js';
import { recordLoginLog } from './recordLoginLog.js';

export async function register(req, res, next) {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const exists = await User.findByEmail(email);
    if (exists) {
      if (exists.github_id) {
        return res.status(400).json({ error: '该邮箱已绑定 Github 账号，请直接用 Github 登录' });
      } else {
        return res.status(400).json({ error: '邮箱已注册，请直接登录。' });
      }
    }

    // 验证用户名格式（如果提供了用户名）
    if (username) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        return res.status(400).json({ error: usernameError });
      }
      // 检查用户名是否已被使用
      const usernameExists = await User.findByUsername(username);
      if (usernameExists) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
    }

    // 验证密码复杂度
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await User.createUser({ id, email, username, passwordHash });

    // 发送验证邮件
    const token = signEmailToken({ id });
    const link = `${PUBLIC_BASE_URL}/verify?token=${token}`;
    const emailSent = await sendVerifyEmail(email, link);

    // 返回成功消息
    res.json({ 
      ok: true, 
      message: "注册成功，请查收验证邮件完成账号激活。",
      emailSent: emailSent 
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) {
      console.warn('收到缺少验证令牌的请求');
      return res.status(400).json({ error: '缺少验证令牌', message: '验证链接无效，缺少必要的令牌。' });
    }
    
    console.log('正在验证邮件令牌...');
    const payload = verifyEmailToken(token);
    
    if (!payload || !payload.id) {
      console.warn('验证失败：无效或过期的令牌', { payload });
      return res.status(400).json({ 
        error: '无效或过期的验证令牌', 
        message: '邮箱验证链接已过期或无效，请重新登录获取新的验证链接。'
      });
    }

    console.log(`验证成功，正在更新用户(${payload.id})的验证状态...`);
    
    // 先检查用户是否存在
    const user = await User.findById(payload.id);
    if (!user) {
      console.error(`用户验证失败：ID ${payload.id} 不存在`);
      return res.status(404).json({ 
        error: '用户不存在', 
        message: '找不到对应的用户账号，请重新注册。'
      });
    }
    
    // 如果用户已经验证过邮箱，直接返回成功
    if (user.verified) {
      console.log(`用户(${payload.id})邮箱已经验证过`);
      return res.json({ 
        message: "邮箱已验证，无需重复验证。",
        alreadyVerified: true
      });
    }

    // 使用 pool.query 更新用户状态
    const result = await pool.query(
      "UPDATE users SET verified=TRUE WHERE id=$1",
      [payload.id]
    );

    if (result.rowCount === 0) {
      console.error(`用户验证失败：更新操作对ID ${payload.id} 无效`);
      return res.status(404).json({ 
        error: '验证失败', 
        message: '更新验证状态失败，请联系管理员。'
      });
    }

    console.log(`用户(${payload.id})邮箱验证成功完成`);

    // 返回 JSON 响应，与文档保持一致
    res.json({ 
      message: "邮箱验证成功，现在您可以登录账号了。",
      verified: true
    });

  } catch (err) {
    console.error("邮箱验证过程中出错:", err);
    // 返回友好的错误信息
    res.status(500).json({
      error: '服务器内部错误',
      message: '验证邮箱时发生错误，请稍后再试或联系客服。'
    });
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, token, backupCode } = req.body;
    const user = await User.findByEmail(email);
    console.log('[LOGIN] 查询到用户信息:', user);
    if (!user) return res.status(401).json({ error: '账号或密码错误' });
    if (!user.password_hash) {
      return res.status(400).json({ error: '请用第三方账号登录' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '账号或密码错误' });
    // 检查邮箱是否已验证
    if (!user.verified) {
      const verificationToken = signEmailToken({ id: user.id });
      const verificationLink = `${PUBLIC_BASE_URL}/verify?token=${verificationToken}`;
      const emailSent = await sendVerifyEmail(user.email, verificationLink);
      return res.status(403).json({ 
        error: 'email_not_verified', 
        message: '您的邮箱尚未验证，请先完成邮箱验证。我们已重新发送一封验证邮件。',
        emailSent: emailSent
      });
    }
    // 只要用户有totp_secret就强制2FA校验
    if (user.totp_secret) {
      console.log(`[2FA] 用户 ${user.id} 检测到 totp_secret，强制要求2FA校验`);
      // 如果用户提供了备份码，优先尝试验证备份码
      if (backupCode) {
        console.log(`[2FA] 用户 ${user.id} 尝试用备份码登录`);
        const backupOk = await verifyBackupCode(user.id, backupCode);
        if (backupOk) {
          console.log(`[2FA] 用户 ${user.id} 备份码校验通过，允许登录`);
          // 备份码验证成功，继续登录流程
          // 生成Token
          const accessToken = signAccessToken({ uid: user.id });
          const { token: refreshToken } = await import('../services/refreshTokenService.js').then(m => m.createRefreshToken(user.id, req.headers['user-agent'], null));
          // 使用httpOnly Cookie下发Token，防止XSS窃取
          res.cookie('accessToken', accessToken, {
            httpOnly: true, // 仅允许服务端访问
            secure: process.env.NODE_ENV === 'production', // 生产环境强制HTTPS
            sameSite: 'strict', // 防止CSRF
            maxAge: 10 * 60 * 1000 // 10分钟
          });
          res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
          });
          // 响应体不再返回Token，仅返回登录状态
          return res.json({ ok: true, tokenType: 'Bearer', expiresIn: 600 });
        }
        // 备份码验证失败
        console.warn(`[2FA] 用户 ${user.id} 备份码校验失败`);
        await recordLoginLog({ req, user, success: false, reason: '2FA备份码错误' });
        return res.status(401).json({ error: 'invalid backup code' });
      }
      // 如果没有提供备份码，检查 TOTP 令牌
      if (!token) {
        console.warn(`[2FA] 用户 ${user.id} 未输入2FA验证码，拒绝登录`);
        await recordLoginLog({ req, user, success: false, reason: '2FA未输入验证码' });
        return res.status(401).json({ error: 'TOTP_REQUIRED' });
      }
      const encryptedSecret = user.totp_secret;
      if (!encryptedSecret) {
        console.error(`[2FA] 用户 ${user.id} 2FA密钥缺失`);
        await recordLoginLog({ req, user, success: false, reason: '2FA密钥缺失' });
        return res.status(500).json({ error: 'Internal server error during 2FA setup.' });
      }
      const decryptedSecret = decrypt(encryptedSecret);
      if (!decryptedSecret) {
        console.error(`[2FA] 用户 ${user.id} 2FA密钥解密失败`);
        await recordLoginLog({ req, user, success: false, reason: '2FA密钥解密失败' });
        return res.status(500).json({ error: 'Internal server error during 2FA verification.' });
      }
      const { verifyTotp } = await import('./totp.js');
      const ok = verifyTotp(decryptedSecret, token);
      if (!ok) {
        console.warn(`[2FA] 用户 ${user.id} 2FA验证码错误`);
        await recordLoginLog({ req, user, success: false, reason: '2FA验证码错误' });
        return res.status(401).json({ error: 'invalid token' });
      }
      // TOTP验证通过，下发Token
      console.log(`[2FA] 用户 ${user.id} 2FA校验通过，允许登录`);
      const accessToken = signAccessToken({ uid: user.id });
      const { token: refreshToken } = await import('../services/refreshTokenService.js').then(m => m.createRefreshToken(user.id, req.headers['user-agent'], null));
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    } else {
      // 未开启2FA，直接下发Token
      const accessToken = signAccessToken({ uid: user.id });
      const { token: refreshToken } = await import('../services/refreshTokenService.js').then(m => m.createRefreshToken(user.id, req.headers['user-agent'], null));
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    }
    // 新设备/新IP检测与邮件提醒
    try {
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      const deviceInfo = req.body.deviceInfo || userAgent;
      const fingerprint = req.body.fingerprint;
      const location = await import('../utils/geoip.js').then(m => m.getGeoInfo(ip));
      const history = await import('../services/loginHistoryService.js').then(m => m.getLoginHistory(user.id, 20));
      let deviceKey = deviceInfo || fingerprint || userAgent;
      let isNewDevice = false;
      if (deviceKey) {
        isNewDevice = !history.some(h => (h.fingerprint === fingerprint && fingerprint) || (h.userAgent === userAgent && !fingerprint && !deviceInfo));
      }
      let isLocationChanged = false;
      if (!isNewDevice && deviceKey) {
        const lastSameDevice = history.find(h => (h.fingerprint === fingerprint && fingerprint) || (h.userAgent === userAgent && !fingerprint && !deviceInfo));
        if (lastSameDevice && lastSameDevice.location && location) {
          try {
            const lastLoc = typeof lastSameDevice.location === 'string' ? JSON.parse(lastSameDevice.location) : lastSameDevice.location;
            if (
              (lastLoc.country && location.country && lastLoc.country !== location.country) ||
              (lastLoc.region && location.region && lastLoc.region !== location.region) ||
              (lastLoc.city && location.city && lastLoc.city !== location.city)
            ) {
              isLocationChanged = true;
            }
          } catch {}
        }
      }
      if (isNewDevice || isLocationChanged) {
        let deviceDesc = userAgent;
        try {
          if (/Chrome/i.test(userAgent)) deviceDesc = 'Chrome';
          else if (/Firefox/i.test(userAgent)) deviceDesc = 'Firefox';
          else if (/Safari/i.test(userAgent)) deviceDesc = 'Safari';
          else if (/Edge/i.test(userAgent)) deviceDesc = 'Edge';
          else if (/MSIE|Trident/i.test(userAgent)) deviceDesc = 'IE';
          else if (/Opera|OPR/i.test(userAgent)) deviceDesc = 'Opera';
          if (/Windows/i.test(userAgent)) deviceDesc += '（Windows）';
          else if (/Macintosh|Mac OS/i.test(userAgent)) deviceDesc += '（macOS）';
          else if (/Linux/i.test(userAgent)) deviceDesc += '（Linux）';
          else if (/Android/i.test(userAgent)) deviceDesc += '（Android）';
          else if (/iPhone|iPad|iOS/i.test(userAgent)) deviceDesc += '（iOS）';
        } catch {}
        let locationStr = '未知';
        if (location) {
          locationStr = [location.country, location.region, location.city].filter(Boolean).join(' ');
          if (!locationStr) locationStr = '未知';
        }
        await import('../mail/resend.js').then(m => m.sendLoginAlertEmail(user.email, {
          loginTime: new Date().toLocaleString('zh-CN', { hour12: false }),
          device: deviceDesc,
          ip: ip,
          location: locationStr
        }));
      }
    } catch (e) {
      console.error('[LOGIN] 新设备/新IP检测或邮件提醒失败:', e);
    }
    return res.json({ ok: true, tokenType: 'Bearer', expiresIn: 600 });
  } catch (err) {
    console.error("Error during login:", err);
    next(err);
  }
}
