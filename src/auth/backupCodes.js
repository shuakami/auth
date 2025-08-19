/**
 * 备份码服务
 * 使用新的模块化架构，保持API兼容性
 */
import { BackupCodeService } from '../services/auth/BackupCodeService.js';

// 创建服务实例
const backupCodeService = new BackupCodeService();

/**
 * 为用户生成并存储新的备份码（向后兼容）
 * @param {string} userId 用户ID
 * @returns {Promise<string[]>} 生成的备份码数组
 */
export async function generateAndSaveBackupCodes(userId) {
  try {
    const result = await backupCodeService.generateAndSaveBackupCodes(userId);
    return result.codes; // 返回备份码数组，保持原有格式
  } catch (error) {
    console.error('[BackupCode] 兼容接口生成备份码失败:', error);
    throw error;
  }
}

/**
 * 验证用户的备份码（向后兼容）
 * @param {string} userId 用户ID
 * @param {string} code 用户输入的备份码
 * @returns {Promise<boolean>} 验证是否成功
 */
export async function verifyBackupCode(userId, code) {
  try {
    const result = await backupCodeService.verifyBackupCode(userId, code);
    return result.success; // 返回布尔值，保持原有格式
  } catch (error) {
    console.error('[BackupCode] 兼容接口验证备份码失败:', error);
    return false;
  }
}

/**
 * 检查用户是否还有可用的备份码（向后兼容）
 * @param {string} userId 用户ID
 * @returns {Promise<boolean>} 是否有可用的备份码
 */
export async function hasAvailableBackupCodes(userId) {
  try {
    return await backupCodeService.hasAvailableBackupCodes(userId);
  } catch (error) {
    console.error('[BackupCode] 兼容接口检查可用备份码失败:', error);
    return false;
  }
}

/**
 * 获取用户剩余的未使用备份码数量（向后兼容）
 * @param {string} userId 用户ID
 * @returns {Promise<number>} 剩余的未使用备份码数量
 */
export async function getRemainingBackupCodesCount(userId) {
  try {
    return await backupCodeService.getRemainingBackupCodesCount(userId);
  } catch (error) {
    console.error('[BackupCode] 兼容接口获取剩余备份码数量失败:', error);
    return 0;
  }
}

// 导出服务实例以供高级用法
export { backupCodeService }; 