import express                              from 'express';
import { ensureAuth }                       from '../../middlewares/authenticated.js';
import { generateTotpSecret,
         otpauthToDataURL,
         verifyTotp }                       from '../../auth/totp.js';
import { encrypt, decrypt }                 from '../../auth/cryptoUtils.js';
import { generateAndSaveBackupCodes }       from '../../auth/backupCodes.js';
import { authLimiter }                      from '../../middlewares/rateLimit.js';
import * as User                            from '../../services/userService.js';
import bcrypt                               from 'bcryptjs';

const router = express.Router();

/* ---------------------------------------------------------------------------
 *  双因素认证 2-Factor Authentication
 * -------------------------------------------------------------------------*/

/**
 * POST /2fa/setup
 * @tags 双因素认证
 * @summary 初始化并获取2FA设置信息
 * @description
 *   为当前登录用户生成2FA密钥并加密存储，同时生成备份码。
 *   用户需要使用 Authenticator App 扫描二维码或手动输入原始密钥，并**妥善保管备份码**。
 *   需要有效的 Session Cookie (`sid`) 才能访问。
 * 
 *   **调用此接口之后不会直接开启2FA，只有在调用此接口再调用`2fa/verify`之后，2FA才会真的开启。**
 * @security cookieAuth
 * @return {Setup2FAResponse} 200 - 成功获取2FA设置信息 (`secret`字段为原始Base32密钥，仅用于用户首次设置，服务器不存储；`backupCodes`字段为备份码数组，请妥善保管) - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie） - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/2fa/setup', ensureAuth, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: '必须输入密码' });
    const user = await User.findById(req.user.id);
    if (!user || !user.password_hash) return res.status(401).json({ error: '未找到用户或未设置密码' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '密码错误' });

    const { base32, otpauth } = generateTotpSecret(req.user.email);
    const qr = await otpauthToDataURL(otpauth);
    const encryptedSecret = encrypt(base32);
    await User.setTotp(req.user.id, encryptedSecret);
    const backupCodes = await generateAndSaveBackupCodes(req.user.id);
    res.json({ 
      qr, 
      secret: base32,
      backupCodes,
      message: '请立即保存您的备份码！这些备份码只会显示一次，用于在无法使用 2FA 设备时登录您的账户。'
    });
  } catch (err) {
    console.error("Error setting up 2FA:", err);
    next(err);
  }
});

/**
 * POST /2fa/verify
 * @tags 双因素认证
 * @summary 验证用户提供的2FA令牌
 * @description
 *   (速率限制: **10次/分钟/IP**)
 *
 *   验证用户输入的6位动态验证码是否正确。服务器会解密存储的密钥进行验证。
 * 
 *   *注意：此接口本身不再处理 Session，实际登录流程中的2FA验证和 Session 更新已整合到 `/login` 接口。调用此接口通常在 `/login` 返回 **206** 状态码之后。*
 *
 *   验证成功后会**重新生成并保存 Session ID** 以提高安全性。在此期间用户会被登出。
 *   需要有效的 Session Cookie (`sid`) 才能访问。
 * @security cookieAuth
 * @param {Verify2FARequestBody} request.body - 2FA验证信息
 * @return {Verify2FASuccessResponse} 200 - 2FA令牌验证成功 (Session ID 已更新) - application/json
 * @return {ErrorResponse} 401 - 未授权、未设置2FA或无效的2FA令牌 - application/json
 * @return {ErrorResponse} 429 - 请求过于频繁 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/2fa/verify', authLimiter, async (req, res, next) => {
  try {
    const { token } = req.body;
    let userId;
    // 优先支持pending2faUserId（OAuth 2FA场景）
    if (req.session.pending2faUserId) {
      userId = req.session.pending2faUserId;
    } else if (req.user && req.user.id) {
      userId = req.user.id;
    } else {
      return res.status(401).json({ error: '未授权' });
    }
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }
    // 获取加密后的 secret
    const encryptedSecret = await User.getTotpSecret(userId);
    if (!encryptedSecret) {
      return res.status(401).json({ error: '2FA not setup for this user.' });
    }
    // 解密 secret
    const decryptedSecret = decrypt(encryptedSecret);
    if (!decryptedSecret) {
      // 解密失败或验证失败
      console.error(`Failed to decrypt TOTP secret for user ${userId}`);
      return res.status(500).json({ error: 'Failed to verify 2FA token due to internal error.' });
    }
    // 使用解密后的 secret 进行验证
    const ok = verifyTotp(decryptedSecret, token);
    if (!ok) return res.status(401).json({ error: 'Invalid token.' });
    // 验证成功，开启2FA
    await User.enableTotp(userId);
    // 验证成功，重新生成 session 并登录
    req.session.regenerate(async (regenErr) => {
      if (regenErr) {
        return next(regenErr);
      }
      // 2FA场景下自动登录
      const user = await User.findById(userId);
      if (!user) {
        return next(new Error('User not found after 2FA verification'));
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        // 清理pending2fa相关session字段
        delete req.session.pending2fa;
        delete req.session.pending2faUserId;
        req.session.save((saveErr) => {
          if (saveErr) {
            return next(saveErr);
          }
          res.json({ ok: true });
        });
      });
    });
  } catch (err) {
    console.error("Error verifying 2FA:", err);
    next(err);
  }
});

/**
 * POST /2fa/disable
 * @tags 双因素认证
 * @summary 关闭2FA（支持已登录和备份码两种方式）
 * @description
 *   已登录用户可直接关闭2FA；未登录用户需提供邮箱、密码、备份码。
 *   关闭2FA会清空TOTP密钥并删除所有备份码。
 * @param {object} request.body - { email, password, backupCode }（未登录时必填）
 * @return {SimpleSuccessResponse} 200 - 关闭成功
 * @return {ErrorResponse} 400/401 - 参数错误或认证失败
 */
router.post('/2fa/disable', async (req, res, next) => {
  try {
    const { token, backupCode } = req.body;
    let userId;
    if (req.user && req.user.id) {
      userId = req.user.id;
    } else {
      // 未登录用户，需邮箱、密码
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: '缺少必要参数' });
      }
      const user = await User.findByEmail(email);
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: '账号或密码错误' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: '账号或密码错误' });
      userId = user.id;
    }
    // 必须提供token或备份码
    if (!token && !backupCode) {
      return res.status(400).json({ error: '必须提供2FA验证码或备份码' });
    }
    // 校验token
    if (token) {
      const encryptedSecret = await User.getTotpSecret(userId);
      if (!encryptedSecret) return res.status(400).json({ error: '未启用2FA' });
      const decryptedSecret = decrypt(encryptedSecret);
      if (!decryptedSecret) return res.status(500).json({ error: '2FA密钥解密失败' });
      const ok = verifyTotp(decryptedSecret, token);
      if (!ok) return res.status(401).json({ error: '2FA验证码错误' });
    } else if (backupCode) {
      const { verifyBackupCode } = await import('../../auth/backupCodes.js');
      const ok = await verifyBackupCode(userId, backupCode);
      if (!ok) return res.status(401).json({ error: '备份码无效' });
    }
    await User.disableTotp(userId);
    res.json({ ok: true, message: '2FA已关闭' });
  } catch (err) {
    next(err);
  }
});

export default router;
