import express                                from 'express';
import { ensureAuth }                         from '../../middlewares/authenticated.js';
import { generateAndSaveBackupCodes,
         getRemainingBackupCodesCount }       from '../../auth/backupCodes.js';
import * as User                              from '../../services/userService.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

/**
 * POST /backup-codes/generate
 * @tags 双因素认证
 * @summary 生成新的备份码
 * @description
 *   为当前登录用户生成新的一性备份码。需要有效的 Session Cookie (`sid`) 才能访问。
 *   **重要：生成新的备份码会使旧的备份码失效。** 用户必须已启用 2FA 才能生成备份码。
 * 
 *   **必须在请求体中提供 password 字段（当前用户密码），否则无法生成新备份码。**
 * @security cookieAuth
 * @param {GenerateBackupCodesRequestBody} request.body - 必填，当前用户密码
 * @return {GenerateBackupCodesResponse} 200 - 成功生成备份码 - application/json
 * @return {ErrorResponse} 400 - 缺少密码 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie/未设置密码/密码错误） - application/json
 * @return {ErrorResponse} 403 - 用户未启用 2FA - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/backup-codes/generate', ensureAuth, async (req, res, next) => {
  try {
    const { password } = req.body;
    // 检查用户是否已启用 2FA
    const user = await User.findById(req.user.id);
    if (!user || !user.totp_enabled) {
      return res.status(403).json({ error: '2FA must be enabled to generate backup codes' });
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: '未设置密码，无法校验' });
    }
    if (!password) {
      return res.status(400).json({ error: '必须输入密码' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '密码错误' });
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
 * @description 返回当前登录用户剩余的未使用备份码数量。需要有效的 Session Cookie (`sid`) 才能访问。
 * @security cookieAuth
 * @return {RemainingBackupCodesResponse} 200 - 成功获取剩余数量 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Session Cookie） - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
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
