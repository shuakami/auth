/**
 * Refresh Token服务 - 重构后的统一入口
 * 使用模块化架构，提供向后兼容的API
 */
import { TokenServiceController } from './token/TokenServiceController.js';

// 创建控制器实例
const tokenController = new TokenServiceController();

/**
 * 生成并存储新的 Refresh Token（向后兼容）
 * @param {string} userId 用户ID
 * @param {string} deviceInfo 设备指纹/UA等
 * @param {string|null} parentId 父Token ID（轮换链）
 * @param {number} expiresIn 过期秒数，默认15天
 * @returns {Promise<{token: string, id: string, expiresAt: Date}>}
 */
export async function createRefreshToken(userId, deviceInfo, clientId = null, parentId = null, expiresIn = 60 * 60 * 24 * 15) {
  return tokenController.createRefreshToken(userId, deviceInfo, clientId, parentId, expiresIn);
}

/**
 * 校验Refresh Token有效性（向后兼容）
 * @param {string} token
 * @returns {Promise<{valid: boolean, reason?: string, dbToken?: any, payload?: any}>}
 */
export async function validateRefreshToken(token) {
  return tokenController.validateRefreshToken(token);
}

/**
 * 轮换Refresh Token（向后兼容）
 * @param {string} oldToken 旧Refresh Token串
 * @param {string} deviceInfo 当前设备指纹
 * @returns {Promise<{token: string, id: string, expiresAt: Date}>}
 */
export async function rotateRefreshToken(oldToken, deviceInfo) {
  const result = await tokenController.rotateRefreshToken(oldToken, deviceInfo);
  return {
    token: result.token,
    id: result.id,
    expiresAt: result.expiresAt
  };
}

/**
 * 吊销指定Refresh Token（向后兼容）
 * @param {string} id Token主键ID
 * @param {string} reason 吊销原因
 */
export async function revokeRefreshTokenById(id, reason = '') {
  return tokenController.revokeRefreshTokenById(id, reason);
}

/**
 * 检测Refresh Token被盗用（向后兼容）
 * @param {string} parentId 父Token ID
 * @returns {Promise<boolean>} 是否检测到盗用
 */
export async function detectTokenReuse(parentId) {
  return tokenController.detectTokenReuse(parentId);
}

/**
 * 吊销某用户所有Refresh Token（向后兼容）
 * @param {string} userId
 */
export async function revokeAllRefreshTokensForUser(userId) {
  return tokenController.revokeAllRefreshTokensForUser(userId);
}

/**
 * 获取用户所有活跃会话（向后兼容）
 * @param {string} userId
 * @returns {Promise<Array>} 会话数组
 */
export async function getActiveSessionsForUser(userId) {
  return tokenController.getActiveSessionsForUser(userId);
}

/**
 * 获取用户所有活跃会话及其聚合登录历史（性能优化版）
 * @param {string} userId
 * @returns {Promise<Array>} 设备+历史复合信息
 */
export async function getSessionAggregatedInfoForUser(userId) {
  return tokenController.getSessionAggregatedInfoForUser(userId);
}

// 导出控制器实例以供高级用法
export { tokenController }; 