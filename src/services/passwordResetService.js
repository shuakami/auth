/**
 * 密码重置服务
 * 使用新的模块化架构，保持API兼容性
 */
import { PasswordResetService } from './auth/PasswordResetService.js';

// 创建服务实例
const passwordResetService = new PasswordResetService();

/**
 * 生成重置密码 token 并发送邮件（向后兼容）
 * @param {string} email 邮箱地址
 * @param {number} expiresIn 过期时间（毫秒）
 * @returns {Promise<Object>}
 */
export async function createResetToken(email, expiresIn = 30 * 60 * 1000) {
  try {
    const result = await passwordResetService.createResetToken(email, { expiresIn });
    
    // 保持原有的返回格式
    return { 
      exists: result.success,
      success: result.success,
      message: result.message,
      emailSent: result.emailSent
    };
  } catch (error) {
    console.error('[PasswordReset] 兼容接口创建重置令牌失败:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * 校验 token 是否有效，返回 user（向后兼容）
 * @param {string} token 重置令牌
 * @returns {Promise<Object|null>}
 */
export async function verifyResetToken(token) {
  try {
    const result = await passwordResetService.verifyResetToken(token);
    
    // 保持原有的返回格式
    return result ? result.user : null;
  } catch (error) {
    console.error('[PasswordReset] 兼容接口验证重置令牌失败:', error);
    return null;
  }
}

/**
 * 重置密码并失效 token（向后兼容）
 * @param {string} token 重置令牌
 * @param {string} newPassword 新密码
 * @returns {Promise<boolean>}
 */
export async function resetPassword(token, newPassword) {
  try {
    const result = await passwordResetService.resetPassword(token, newPassword);
    return result;
  } catch (error) {
    console.error('[PasswordReset] 兼容接口重置密码失败:', error);
    return false;
  }
}

// 导出服务实例以供高级用法
export { passwordResetService }; 