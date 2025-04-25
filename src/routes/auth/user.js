import express                from 'express';
import { ensureAuth }         from '../../middlewares/authenticated.js';
import * as User              from '../../services/userService.js';
import bcrypt                 from 'bcryptjs';
import { verifyTotp }         from '../../auth/totp.js';
import { verifyBackupCode }   from '../../auth/backupCodes.js';
import { decrypt }            from '../../auth/cryptoUtils.js';

const router = express.Router();

/* ---------------------------------------------------------------------------
 *  用户 User
 * -------------------------------------------------------------------------*/

/**
 * GET /me
 * @tags 用户
 * @summary 获取当前登录用户的信息
 * @description 返回当前通过 Session Cookie (`sid`) 认证的用户的基础信息。Session 具有 **30 分钟** 滚动有效期。
 * @security cookieAuth
 * @return {UserInfoResponse} 200 - 成功获取用户信息 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie） - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.get('/me', ensureAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: '未授权' });
  const { password_hash, ...rest } = user;
  res.json({ user: { ...rest, has_password: !!password_hash } });
});

/**
 * DELETE /me
 * @tags 用户
 * @summary 删除当前登录用户账号
 * @description 需要提供当前密码进行验证。如果启用了 2FA，则还需要提供有效的 TOTP 验证码或备份码。
 * @security cookieAuth
 * @param {object} request.body.required - 验证信息 { password: string, code?: string }
 * @return {SimpleSuccessResponse} 200 - 删除成功
 * @return {ErrorResponse} 400 - 缺少参数或验证码/备份码无效
 * @return {ErrorResponse} 401 - 未授权或密码错误
 * @return {ErrorResponse} 403 - 2FA 验证需要但未提供或无效
 * @return {ErrorResponse} 500 - 服务器内部错误
 */
router.delete('/me', ensureAuth, async (req, res, next) => {
  const { password, code } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: '未授权 - 用户不存在' });
    }

    if (user.password_hash) {
      if (!password) {
        return res.status(400).json({ error: '缺少密码' });
      }
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: '密码错误' });
      }
    } else {
      console.warn(`User ${userId} is deleting account without a password set.`);
    }

    if (user.totp_enabled) {
      if (!code) {
        return res.status(403).json({ error: '需要 2FA 验证码或备份码' });
      }

      let validCode = false;
      const isPossibleTotp = /^[0-9]{6}$/.test(code);
      const encryptedSecret = user.totp_secret;

      if (isPossibleTotp && encryptedSecret) {
        const decryptedSecret = decrypt(encryptedSecret);
        if (decryptedSecret && verifyTotp(decryptedSecret, code)) {
          validCode = true;
        }
      }

      if (!validCode) {
        const backupOk = await verifyBackupCode(userId, code);
        if (backupOk) {
          validCode = true;
        }
      }

      if (!validCode) {
        return res.status(403).json({ error: '无效的 2FA 验证码或备份码' });
      }
    }

    await User.deleteUser(userId);
    
    if (typeof req.logout === 'function') {
      req.logout(function(err) {
        req.session?.destroy?.((destroyErr) => {
          if (err || destroyErr) {
            console.error('Logout or session destroy failed after account deletion:', err || destroyErr);
            return res.status(200).json({ ok: true, message: '账号已删除，但会话清理可能失败' });
          }
          res.json({ ok: true, message: '账号已删除' });
        });
      });
    } else {
      req.session?.destroy?.((destroyErr) => {
         if (destroyErr) {
           console.error('Session destroy failed after account deletion:', destroyErr);
           return res.status(200).json({ ok: true, message: '账号已删除，但会话清理可能失败' });
         }
        res.json({ ok: true, message: '账号已删除' });
      });
    }

  } catch (err) {
    console.error('Error during account deletion:', err);
    res.status(500).json({ error: '删除账号时发生服务器内部错误', detail: err?.message });
  }
});

/**
 * PATCH /me/password
 * @tags 用户
 * @summary 设置或修改当前用户密码
 * @security cookieAuth
 * @param {PasswordUpdateRequestBody} request.body.required - 请求体，包含新密码和（如有）旧密码
 * @return {SimpleSuccessResponse} 200 - 修改成功
 * @return {ErrorResponse} 400 - 参数错误或旧密码错误
 * @return {ErrorResponse} 401 - 未授权
 */
router.patch('/me/password', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: '新密码不能为空' });
    const { validatePassword } = await import('../../utils/passwordPolicy.js');
    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });
    if (user.password_hash) {
      // 已有密码，需校验旧密码
      if (!oldPassword) return res.status(400).json({ error: '请输入旧密码' });
      const valid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!valid) return res.status(400).json({ error: '旧密码错误' });
    }
    // 设置新密码
    const newHash = await bcrypt.hash(newPassword, 10);
    await User.migratePasswordHash(user.id, newHash);
    // 清理除当前 session 外的所有会话
    const sid = req.sessionID;
    await User.clearOtherSessions(user.id, sid);
    res.json({ ok: true, message: '密码设置成功' });
  } catch (err) {
    res.status(500).json({ error: '设置密码失败', detail: err?.message });
  }
});

/**
 * PATCH /me/username
 * @tags 用户
 * @summary 设置或修改当前用户用户名
 * @security cookieAuth
 * @param {UsernameUpdateRequestBody} request.body.required - 新用户名
 * @return {UsernameUpdateResponse} 200 - 修改成功
 * @return {ErrorResponse} 400 - 参数错误或用户名已存在
 * @return {ErrorResponse} 401 - 未授权
 */
router.patch('/me/username', ensureAuth, async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: '缺少用户名' });
  const { validateUsername } = await import('../../utils/usernamePolicy.js');
  const usernameError = validateUsername(username);
  if (usernameError) return res.status(400).json({ error: usernameError });
  // 检查是否已被占用
  const exists = await User.findByUsername(username);
  if (exists && exists.id !== req.user.id) {
    return res.status(400).json({ error: '用户名已被占用' });
  }
  await User.updateUsername(req.user.id, username);
  res.json({ ok: true, username });
});

/**
 * PATCH /me/email
 * @tags 用户
 * @summary 更换当前用户邮箱
 * @security cookieAuth
 * @param {EmailUpdateRequestBody} request.body.required - 新邮箱和当前密码
 * @return {EmailUpdateResponse} 200 - 修改成功
 * @return {ErrorResponse} 400 - 参数错误、密码错误或邮箱已被占用
 * @return {ErrorResponse} 401 - 未授权
 */
router.patch('/me/email', ensureAuth, async (req, res) => {
  const { newEmail, password } = req.body || {};
  if (!newEmail || !password) return res.status(400).json({ error: '缺少新邮箱或密码' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: '未授权' });
  if (!user.password_hash) return res.status(400).json({ error: '未设置密码，无法校验' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: '密码错误' });
  // 检查新邮箱是否已被注册
  const exists = await User.findByEmail(newEmail);
  if (exists && exists.id !== user.id) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }
  // 更新邮箱并重置验证状态
  await User.updateEmail(user.id, newEmail);
  await User.updateEmailVerified?.(user.id, false); // 若有verified字段
  // 发送验证邮件
  const { signEmailToken } = await import('../../auth/jwt.js');
  const { sendVerifyEmail } = await import('../../mail/resend.js');
  const token = signEmailToken({ id: user.id });
  const link = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/verify?token=${token}`;
  await sendVerifyEmail(newEmail, link);
  res.json({ ok: true, message: '邮箱已更新，请查收新邮箱完成验证' });
});

export default router;
