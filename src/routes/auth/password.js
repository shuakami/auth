import express from 'express';
import { register, login, verifyEmail }  from '../../auth/password.js';
import { authLimiter }                   from '../../middlewares/rateLimit.js';
import * as PasswordReset                from '../../services/passwordResetService.js';
import bcrypt                            from 'bcryptjs';
import { signAccessToken } from '../../auth/jwt.js';
import * as RefreshTokenService from '../../services/refreshTokenService.js';
import { recordLoginLog } from '../../auth/recordLoginLog.js';
import { getGeoInfo } from '../../utils/geoip.js';
import { sendLoginAlertEmail } from '../../mail/resend.js';
import * as loginHistoryService from '../../services/loginHistoryService.js';

const router = express.Router();

// Typedefs are in src/types/apiSchema.js

/* ---------------------------------------------------------------------------
 *  认证 Authentication
 * -------------------------------------------------------------------------*/

/**
 * POST /register
 * @tags 认证
 * @summary 用户注册接口
 * @description
 *   (速率限制: **10次/分钟/IP**)
 *
 *   接收用户邮箱和密码，创建新用户账号。
 *   密码需要满足安全要求：
 *   - 长度至少 **10** 位
 *   - 通过 `zxcvbn` 强度检测（评分 >= **2**）
 *
 *   注册成功后会发送验证邮件。
 *   本接口仅完成账号注册和邮箱验证。
 * @param {RegisterRequestBody} request.body - 用户注册信息
 * @return {SimpleSuccessResponse} 200 - 注册成功，验证邮件已发送 - application/json
 * @return {ErrorResponse} 400 - 请求参数错误（如邮箱格式错误、密码不符合要求） - application/json
 * @return {ErrorResponse} 409 - 用户已存在 - application/json
 * @return {ErrorResponse} 429 - 请求过于频繁 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/register', authLimiter, register);

/**
 * GET /verify
 * @tags 认证
 * @summary 验证用户邮箱
 * @description
 *   通过点击邮件中的链接来验证用户的邮箱地址。验证成功后用户才能正常登录。
 *   
 *   - token参数为注册后发送到邮箱的验证链接中的JWT字符串。
 *   - 典型调用方式：GET /verify?token=xxxxxx
 *
 * @param {string} token.query.required - 邮箱验证令牌（JWT字符串）
 * @return {VerifyEmailSuccessResponse} 200 - 邮箱验证成功 - application/json
 * @return {ErrorResponse} 400 - 无效或过期的令牌 - application/json
 * @return {ErrorResponse} 404 - 用户不存在 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.get('/verify', verifyEmail);

/**
 * POST /login
 * @tags 认证
 * @summary 用户登录
 * @param {LoginRequestBody} request.body - 登录请求体（支持deviceInfo和fingerprint字段）
 * @return {LoginSuccessResponse} 200 - 登录成功 - application/json
 * @return {ErrorResponse} 400 - 请求参数错误（如邮箱格式错误、密码不符合要求） - application/json
 * @return {ErrorResponse} 401 - 账号或密码错误 - application/json
 * @return {ErrorResponse} 403 - 邮箱未验证 - application/json
 * @return {ErrorResponse} 429 - 请求过于频繁 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password, token, backupCode, deviceInfo, fingerprint } = req.body;
    const user = await (await import('../../services/userService.js')).findByEmail(email);
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    let location = null;
    location = await getGeoInfo(ip);
    if (!user) {
      await recordLoginLog({ req, user: null, success: false, reason: '账号或密码错误', location, fingerprint });
      return res.status(401).json({ error: '账号或密码错误' });
    }
    if (!user.password_hash) {
      await recordLoginLog({ req, user, success: false, reason: '请用第三方账号登录', location, fingerprint });
      return res.status(400).json({ error: '请用第三方账号登录' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await recordLoginLog({ req, user, success: false, reason: '账号或密码错误', location, fingerprint });
      return res.status(401).json({ error: '账号或密码错误' });
    }
    if (!user.verified) {
      await recordLoginLog({ req, user, success: false, reason: '邮箱未验证', location, fingerprint });
      // 重新发送验证邮件
      const { signEmailToken } = await import('../../auth/jwt.js');
      const { sendVerifyEmail } = await import('../../mail/resend.js');
      const verificationToken = signEmailToken({ id: user.id });
      const verificationLink = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;
      const emailSent = await sendVerifyEmail(user.email, verificationLink);
      return res.status(403).json({ 
        error: 'email_not_verified', 
        message: '您的邮箱尚未验证，请先完成邮箱验证。我们已重新发送一封验证邮件。',
        emailSent: emailSent
      });
    }
    // 登录成功，生成Access Token和Refresh Token
    const accessToken = signAccessToken({ uid: user.id });
    const { token: refreshToken } = await RefreshTokenService.createRefreshToken(user.id, deviceInfo || userAgent, null);
    // 用httpOnly Cookie下发Token，防止XSS
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000 // 10分钟
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
    });
    await recordLoginLog({ req, user, success: true, location, fingerprint });

    // 新设备/新IP检测与邮件提醒
    if (user && user.id) {
      // 查询最近20条登录历史
      const history = await loginHistoryService.getLoginHistory(user.id, 20);
      // 1. 新设备判定（优先deviceInfo，其次fingerprint，再次userAgent）
      let deviceKey = deviceInfo || fingerprint || userAgent;
      let isNewDevice = false;
      if (deviceKey) {
        isNewDevice = !history.some(h => (h.fingerprint === fingerprint && fingerprint) || (h.userAgent === userAgent && !fingerprint && !deviceInfo));
      }
      // 2. 地理位置变化判定（同设备下，城市/省/国家变更才提醒）
      let isLocationChanged = false;
      if (!isNewDevice && deviceKey) {
        // 找到同设备的最近一次登录
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
        // 解析设备描述
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
        await sendLoginAlertEmail(user.email, {
          loginTime: new Date().toLocaleString('zh-CN', { hour12: false }),
          device: deviceDesc,
          ip: ip,
          location: locationStr
        });
      }
    }
    // 响应体不再返回Token字段
    res.json({ ok: true, tokenType: 'Bearer', expiresIn: 600 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /forgot-password
 * @tags 认证
 * @summary 忘记密码 - 发送重置邮件
 * @param {ForgotPasswordRequestBody} request.body.required - 请求体，包含邮箱
 * @return {ForgotPasswordResponse} 200 - 邮件发送成功（无论邮箱是否存在，均返回成功）
 * @return {ForgotPasswordResponse} 404 - 邮箱未注册
 */
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '邮箱不能为空' });
  const result = await PasswordReset.createResetToken(email);
  if (result.exists) {
    res.json({ ok: true, exists: true, message: '重置密码邮件已发送，请查收。' });
  } else {
    res.status(404).json({ ok: false, exists: false, error: '该邮箱未注册' });
  }
});

/**
 * POST /reset-password
 * @tags 认证
 * @summary 重置密码
 * @param {object} request.body - { token, password }
 * @return {SimpleSuccessResponse} 200 - 密码重置成功
 * @return {ErrorResponse} 400 - 参数错误或 token 无效
 */
router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: '参数不完整' });
  // 可复用密码复杂度校验
  const { validatePassword } = await import('../../utils/passwordPolicy.js');
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const ok = await PasswordReset.resetPassword(token, password);
  if (!ok) return res.status(400).json({ error: '重置链接无效或已过期' });
  res.json({ ok: true, message: '密码重置成功，请使用新密码登录。' });
});

/**
 * POST /resend-verify
 * @tags 认证
 * @summary 重新发送邮箱验证邮件
 * @param {object} request.body - { email?: string }
 * @return {SimpleSuccessResponse} 200 - 邮件发送成功
 * @return {ErrorResponse} 400 - 参数错误或发送失败
 */
router.post('/resend-verify', async (req, res) => {
  let email = req.body?.email;
  if (!email && req.user) {
    email = req.user.email;
  }
  if (!email) return res.status(400).json({ error: '缺少邮箱参数' });
  const user = await (await import('../../services/userService.js')).findByEmail(email);
  if (!user) return res.status(400).json({ error: '用户不存在' });
  if (user.verified) return res.status(400).json({ error: '邮箱已验证，无需重复发送' });
  const { signEmailToken } = await import('../../auth/jwt.js');
  const token = signEmailToken({ id: user.id });
  const { sendVerifyEmail } = await import('../../mail/resend.js');
  const link = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/verify?token=${token}`;
  const ok = await sendVerifyEmail(email, link);
  if (ok) {
    res.json({ ok: true, message: '验证邮件已发送，请查收' });
  } else {
    res.status(400).json({ error: '发送失败或触发频率限制' });
  }
});


export default router;
