import express from 'express';
import { register, login, verifyEmail }  from '../../auth/password.js';
import { authLimiter }                   from '../../middlewares/rateLimit.js';
import * as PasswordReset                from '../../services/passwordResetService.js';
import bcrypt                            from 'bcryptjs';

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
 *   注册成功后会发送验证邮件，并重新生成 Session ID 并保存。
 *   通过 Passport.js 建立一个具有 **30 分钟** 滚动有效期的 Session。
 * @param {RegisterRequestBody} request.body - 用户注册信息
 * @return {SimpleSuccessResponse} 200 - 注册成功并已登录 (Session 已建立) - application/json
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
 * @description 通过点击邮件中的链接来验证用户的邮箱地址。验证成功后用户才能正常登录。
 * @param {string} token - 邮箱验证令牌 (此 token 为 JWT，仅用于验证邮箱) - in:query
 * @return {VerifyEmailSuccessResponse} 200 - 邮箱验证成功 - application/json
 * @return {ErrorResponse} 400 - 无效或过期的令牌 - application/json
 * @return {ErrorResponse} 404 - 用户不存在 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.get('/verify', verifyEmail);

/**
 * POST /login
 * @tags 认证
 * @summary 用户登录接口 (Session认证)
 * @description
 *   (速率限制: **10次/分钟/IP**)
 *
 *   使用邮箱和密码进行登录。用户必须已验证邮箱才能成功登录。
 *
 *   **2FA 流程:**
 *   - 如果用户启用了2FA，则必须在请求体中额外提供 `token` (6位TOTP码) 或 `backupCode` (一次性备份码) 中的一个。
 *   - 登录成功（包括2FA验证通过）后，服务器会重新生成并保存 Session ID，并通过 Passport.js 建立一个 Session，通过 `Set-Cookie` 响应头返回 Session ID (`sid`)。
 *
 *   **Session 管理:**
 *   - Session 的有效期为 **30 分钟**，但用户每次与服务器交互（发送请求）时，有效期会自动刷新（滚动续期）。
 *   - 如果用户 **30 分钟** 内无任何操作，Session 将失效，需要重新登录。
 *   - 后续请求需要携带此 Cookie (`sid`) 进行认证。
 * @param {LoginRequestBody} request.body - 用户登录信息 (包含 `email`, `password`, 以及可选的 `username`, `token` 或 `backupCode`)
 * @return {SimpleSuccessResponse} 200 - 登录成功 (Session 已建立) - application/json
 * @return {ErrorResponse} 206 - 需要进行2FA验证 (用户启用了2FA但未提供 `token` 或 `backupCode`) - application/json
 * @return {ErrorResponse} 400 - 请求参数错误 - application/json
 * @return {ErrorResponse} 401 - 认证失败 (可能原因: 邮箱/密码错误、无效的TOTP令牌、或无效的备份码) - application/json
 * @return {ErrorResponse} 403 - 邮箱未验证 (包含错误代码`email_not_verified`) - application/json
 * @return {ErrorResponse} 429 - 请求过于频繁 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/login', authLimiter, login);



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
