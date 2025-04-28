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
