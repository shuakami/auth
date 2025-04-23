import express from 'express';
import { register, login, verifyEmail } from '../auth/password.js';
import { ensureAuth } from '../middlewares/authenticated.js';
import { generateTotpSecret, otpauthToDataURL, verifyTotp } from '../auth/totp.js';
import * as User from '../services/userService.js';

const router = express.Router();

// Typedefs are in src/types/apiSchema.js

/**
 * POST /register
 * @tags 认证
 * @summary 用户注册接口
 * @description 接收用户邮箱和密码，创建新用户账号。密码需要满足最低安全要求（例如长度）。注册成功后会发送验证邮件，并通过 Passport.js 建立一个具有 30 分钟滚动有效期的 Session。
 * @param {RegisterRequestBody} request.body.required - 用户注册信息
 * @return {SimpleSuccessResponse} 200 - 注册成功并已登录 (Session 已建立) - eg: {"ok": true}
 * @return {ErrorResponse} 400 - 请求参数错误（如邮箱格式错误、密码太短） - eg: {"error": "Invalid email format."}
 * @return {ErrorResponse} 409 - 用户已存在 - eg: {"error": "User already exists."}
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/register', register);

/**
 * POST /login
 * @tags 认证
 * @summary 用户登录接口 (Session认证)
 * @description 使用邮箱和密码进行登录。登录成功后，服务器会通过 Passport.js 建立一个 Session 并通过 Set-Cookie 响应头返回 Session ID (`sid`)。
 * Session 的有效期为 30 分钟，但用户每次与服务器交互（发送请求）时，有效期会自动刷新（滚动续期）。如果用户 30 分钟内无任何操作，Session 将失效，需要重新登录。
 * 后续请求需要携带此 Cookie 进行认证。如果用户启用了2FA，需要先进行2FA验证。
 * @param {LoginRequestBody} request.body.required - 用户登录信息
 * @return {SimpleSuccessResponse} 200 - 登录成功 (Session 已建立) - eg: {"ok": true}
 * @return {ErrorResponse} 206 - 需要进行2FA验证 - eg: {"error": "TOTP_REQUIRED"}
 * @return {ErrorResponse} 400 - 请求参数错误 - eg: {"error": "Email and password are required."}
 * @return {ErrorResponse} 401 - 邮箱或密码错误，或用户未验证邮箱 - eg: {"error": "Invalid credentials or email not verified."}
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/login', login);

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
 * @description 为当前登录用户生成2FA密钥和对应的二维码。用户需要使用Authenticator App扫描二维码或手动输入密钥。需要有效的 Session Cookie 才能访问。
 * @security cookieAuth
 * @return {Setup2FAResponse} 200 - 成功获取2FA设置信息 (secret字段仅用于调试或特殊场景，生产环境建议移除)
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie） - eg: {"error": "unauthenticated"}
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/2fa/setup', ensureAuth, async (req, res, next) => {
  try {
    const { base32, otpauth } = generateTotpSecret();
    const qr = await otpauthToDataURL(otpauth);
    await User.setTotp(req.user.id, base32);
    // 返回 secret 主要用于方便调试或特定场景，生产环境建议移除
    res.json({ qr, secret: base32 });
  } catch (err) {
    next(err);
  }
});

// 2FA verify
/**
 * POST /2fa/verify
 * @tags 双因素认证
 * @summary 验证用户提供的2FA令牌
 * @description 验证用户输入的6位动态验证码是否正确。需要有效的 Session Cookie 才能访问。
 * @security cookieAuth
 * @param {Verify2FARequestBody} request.body.required - 2FA验证信息
 * @return {Verify2FASuccessResponse} 200 - 2FA令牌验证成功 - eg: {"ok": true}
 * @return {ErrorResponse} 400 - 请求参数错误 - eg: {"error": "Token is required."}
 * @return {ErrorResponse} 401 - 未授权、未设置2FA或无效的2FA令牌 - eg: {"error": "Invalid token or 2FA not setup."}
 * @return {ErrorResponse} 500 - 服务器内部错误 - eg: {"error": "Internal server error."}
 */
router.post('/2fa/verify', ensureAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }
  const secret = await User.getTotpSecret(req.user.id);
  if (!secret) {
      return res.status(401).json({ error: '2FA not setup for this user.' });
  }
  const ok = verifyTotp(secret, token);
  if (!ok) return res.status(401).json({ error: 'Invalid token.' });
  // 验证成功，Session 仍然有效
  res.json({ ok: true });
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

export default router;
