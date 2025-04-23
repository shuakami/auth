import express from 'express';
import { register, login, verifyEmail } from '../auth/password.js';
import { ensureAuth } from '../middlewares/authenticated.js';
import { generateTotpSecret, otpauthToDataURL, verifyTotp } from '../auth/totp.js';
import * as User from '../services/userService.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { verifyCsrf } from '../middlewares/csrf.js';
import { encrypt, decrypt } from '../auth/cryptoUtils.js';
import { generateAndSaveBackupCodes, getRemainingBackupCodesCount } from '../auth/backupCodes.js';

const router = express.Router();

// Typedefs are in src/types/apiSchema.js

/**
 * POST /register
 * @tags 认证
 * @summary 用户注册接口
 * @description (速率限制: 10次/分钟/IP) (CSRF保护: 需要 X-XSRF-TOKEN 请求头) 接收用户邮箱和密码，创建新用户账号。
 * 密码需要满足安全要求：长度至少10位，并通过 zxcvbn 强度检测（评分>=2）。
 * 注册成功后会发送验证邮件，并重新生成 Session ID 并保存，通过 Passport.js 建立一个具有 30 分钟滚动有效期的 Session。
 * @param {RegisterRequestBody} request.body.required - 用户注册信息
 * @return {SimpleSuccessResponse} 200 - 注册成功并已登录 (Session 已建立) - eg: {"ok": true}
 * @return {ErrorResponse} 403 - 无效或缺失 CSRF 令牌
 * @return {ErrorResponse} 400 - 请求参数错误（如邮箱格式错误、密码不符合要求） - eg: {"error": "密码长度至少需要10个字符"} or {"error": "密码太弱..."}
 * @return {ErrorResponse} 409 - 用户已存在 - eg: {"error": "User already exists."}
 * @return {ErrorResponse} 429 - 请求过于频繁
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/register', authLimiter, verifyCsrf, register);

/**
 * POST /login
 * @tags 认证
 * @summary 用户登录接口 (Session认证)
 * @description (速率限制: 10次/分钟/IP) (CSRF保护: 需要 X-XSRF-TOKEN 请求头) 使用邮箱和密码进行登录。
 * 如果用户启用了2FA，则必须在请求体中额外提供 `token` (6位TOTP码) 或 `backupCode` (一次性备份码) 中的一个。
 * 登录成功（包括2FA验证通过）后，服务器会重新生成并保存 Session ID，并通过 Passport.js 建立一个 Session，通过 Set-Cookie 响应头返回 Session ID (`sid`)。
 * Session 的有效期为 30 分钟，但用户每次与服务器交互（发送请求）时，有效期会自动刷新（滚动续期）。如果用户 30 分钟内无任何操作，Session 将失效，需要重新登录。
 * 后续请求需要携带此 Cookie (`sid`) 进行认证。
 * @param {LoginRequestBody} request.body.required - 用户登录信息 (包含 email, password, 以及可选的 token 或 backupCode)
 * @return {SimpleSuccessResponse} 200 - 登录成功 (Session 已建立) - eg: {"ok": true}
 * @return {ErrorResponse} 403 - 无效或缺失 CSRF 令牌
 * @return {ErrorResponse} 206 - 需要进行2FA验证 (用户启用了2FA但未提供 token 或 backupCode) - eg: {"error": "TOTP_REQUIRED"}
 * @return {ErrorResponse} 400 - 请求参数错误 - eg: {"error": "Email and password are required."}
 * @return {ErrorResponse} 401 - 认证失败 (邮箱/密码错误、用户未验证邮箱、无效的TOTP令牌、或无效的备份码) - eg: {"error": "invalid credentials"} or {"error": "invalid token"} or {"error": "invalid backup code"}
 * @return {ErrorResponse} 429 - 请求过于频繁
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/login', authLimiter, verifyCsrf, login);

/**
 * GET /verify
 * @tags 认证
 * @summary 验证用户邮箱
 * @description 通过点击邮件中的链接来验证用户的邮箱地址。
 * @param {string} request.query.token.required - 邮箱验证令牌 (此 token 为 JWT，仅用于验证邮箱，非 Session 认证)
 * @return {string} 200 - 邮箱验证成功页面或消息 - eg: Email verified successfully.
 * @return {string} 400 - 无效或过期的令牌 - eg: invalid token
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.get('/verify', verifyEmail);

// 2FA setup
/**
 * POST /2fa/setup
 * @tags 双因素认证
 * @summary 初始化并获取2FA设置信息
 * @description (CSRF保护: 需要 X-XSRF-TOKEN 请求头) 为当前登录用户生成2FA密钥并加密存储，同时生成备份码。
 * 用户需要使用Authenticator App扫描二维码或手动输入原始密钥，并妥善保管备份码。需要有效的 Session Cookie 才能访问。
 * @security cookieAuth
 * @return {Setup2FAResponse} 200 - 成功获取2FA设置信息 (secret字段为原始Base32密钥，仅用于用户首次设置，服务器不存储；backupCodes字段为备份码数组，请妥善保管)
 * @return {ErrorResponse} 403 - 无效或缺失 CSRF 令牌
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie） - eg: {"error": "unauthenticated"}
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/2fa/setup', verifyCsrf, ensureAuth, async (req, res, next) => {
  try {
    const { base32, otpauth } = generateTotpSecret();
    const qr = await otpauthToDataURL(otpauth);

    // 加密 TOTP secret
    const encryptedSecret = encrypt(base32);

    // 存储加密后的 secret
    await User.setTotp(req.user.id, encryptedSecret);

    // 同时生成备份码
    const backupCodes = await generateAndSaveBackupCodes(req.user.id);

    // 返回二维码、原始 base32 密钥和备份码
    res.json({ 
      qr, 
      secret: base32,
      backupCodes,
      message: '请立即保存您的备份码！这些备份码只会显示一次，用于在无法使用 2FA 设备时登录您的账户。'
    });
  } catch (err) {
    // 处理加密或数据库错误
    console.error("Error setting up 2FA:", err);
    next(err);
  }
});

// 2FA verify
/**
 * POST /2fa/verify
 * @tags 双因素认证
 * @summary 验证用户提供的2FA令牌 (此接口主要用于登录流程中的2FA验证)
 * @description (速率限制: 10次/分钟/IP) (CSRF保护: 需要 X-XSRF-TOKEN 请求头) 验证用户输入的6位动态验证码是否正确。服务器会解密存储的密钥进行验证。
 * 注意：此接口本身不再处理 Session，实际登录流程中的2FA验证和 Session 更新已整合到 `/login` 接口。调用此接口通常在 `/login` 返回 206 状态码之后。
 * 验证成功后会重新生成并保存 Session ID 以提高安全性。需要有效的 Session Cookie 才能访问。
 * @security cookieAuth
 * @param {Verify2FARequestBody} request.body.required - 2FA验证信息
 * @return {Verify2FASuccessResponse} 200 - 2FA令牌验证成功 (Session ID 已更新) - eg: {"ok": true}
 * @return {ErrorResponse} 403 - 无效或缺失 CSRF 令牌
 * @return {ErrorResponse} 400 - 请求参数错误 - eg: {"error": "Token is required."}
 * @return {ErrorResponse} 401 - 未授权、未设置2FA或无效的2FA令牌 - eg: {"error": "Invalid token or 2FA not setup."}
 * @return {ErrorResponse} 429 - 请求过于频繁
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/2fa/verify', authLimiter, verifyCsrf, ensureAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }
    // 获取加密后的 secret
    const encryptedSecret = await User.getTotpSecret(req.user.id);
    if (!encryptedSecret) {
      return res.status(401).json({ error: '2FA not setup for this user.' });
    }

    // 解密 secret
    const decryptedSecret = decrypt(encryptedSecret);
    if (!decryptedSecret) {
      // 解密失败或验证失败
      console.error(`Failed to decrypt TOTP secret for user ${req.user.id}`);
      return res.status(500).json({ error: 'Failed to verify 2FA token due to internal error.' });
    }

    // 使用解密后的 secret 进行验证
    const ok = verifyTotp(decryptedSecret, token);
    if (!ok) return res.status(401).json({ error: 'Invalid token.' });

    // 验证成功，重新生成 session
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.json({ ok: true });
      });
    });
  } catch (err) {
    console.error("Error verifying 2FA:", err);
    next(err);
  }
});

/**
 * GET /me
 * @tags 用户
 * @summary 获取当前登录用户的信息
 * @description 返回当前通过 Session Cookie (`sid`) 认证的用户的基础信息。Session 具有 30 分钟滚动有效期。
 * @security cookieAuth
 * @return {UserInfoResponse} 200 - 成功获取用户信息 - eg: {"user": {"id": "clx...", "email": "user@example.com", "isVerified": true, "is2FAEnabled": false}}
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie） - eg: {"error": "unauthenticated"}
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.get('/me', ensureAuth, (req, res) => res.json({ user: req.user }));

/**
 * POST /backup-codes/generate
 * @tags 双因素认证
 * @summary 生成新的备份码
 * @description (CSRF保护: 需要 X-XSRF-TOKEN 请求头) 为当前登录用户生成新的一次性备份码。需要有效的 Session Cookie 才能访问。
 * 生成新的备份码会使旧的备份码失效。用户必须已启用 2FA 才能生成备份码。
 * @security cookieAuth
 * @return {GenerateBackupCodesResponse} 200 - 成功生成备份码 - eg: {"codes": ["ABCD1234", "EFGH5678", ...]}
 * @return {ErrorResponse} 403 - 无效或缺失 CSRF 令牌，或用户未启用 2FA
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie）
 * @return {ErrorResponse} 500 - 服务器内部错误
 */
router.post('/backup-codes/generate', verifyCsrf, ensureAuth, async (req, res, next) => {
  try {
    // 检查用户是否已启用 2FA
    const user = await User.findById(req.user.id);
    if (!user || !user.totp_enabled) {
      return res.status(403).json({ error: '2FA must be enabled to generate backup codes' });
    }

    // 生成新的备份码（这会删除旧的备份码）
    const codes = await generateAndSaveBackupCodes(req.user.id);
    res.json({ codes });
  } catch (err) {
    console.error("Error generating backup codes:", err);
    next(err);
  }
});

/**
 * GET /backup-codes/remaining
 * @tags 双因素认证
 * @summary 获取剩余可用的备份码数量
 * @description 返回当前登录用户剩余的未使用备份码数量。需要有效的 Session Cookie 才能访问。
 * @security cookieAuth
 * @return {RemainingBackupCodesResponse} 200 - 成功获取剩余数量 - eg: {"count": 8}
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie）
 * @return {ErrorResponse} 500 - 服务器内部错误
 */
router.get('/backup-codes/remaining', ensureAuth, async (req, res, next) => {
  try {
    const count = await getRemainingBackupCodesCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error("Error getting remaining backup codes count:", err);
    next(err);
  }
});

export default router;
