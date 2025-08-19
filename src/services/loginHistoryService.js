/**
 * 登录历史服务
 * 使用新的模块化架构，保持API兼容性
 */
import { LoginHistoryService } from './auth/LoginHistoryService.js';

// 创建服务实例
const loginHistoryService = new LoginHistoryService();

/**
 * 记录一次登录历史（向后兼容）
 * @param {Object} param 登录数据
 * @returns {Promise<string>} 记录ID
 */
export async function recordLogin(param) {
  try {
    const { userId, ip, fingerprint, userAgent, location, success, failReason } = param;
    
    // 转换为新格式
    const loginData = {
      userId,
      ip,
      fingerprint,
      userAgent,
      location,
      success,
      failReason,
      loginMethod: 'password', // 默认值
      deviceType: 'web' // 默认值
    };

    return await loginHistoryService.recordLogin(loginData);
  } catch (error) {
    console.error('[LoginHistory] 兼容接口记录登录失败:', error);
    throw error;
  }
}

/**
 * 查询用户的登录历史（向后兼容）
 * @param {string} userId 用户ID
 * @param {number} limit 返回条数
 * @returns {Promise<Array>} 登录历史数组
 */
export async function getLoginHistory(userId, limit = 20) {
  try {
    const result = await loginHistoryService.getLoginHistory(userId, { 
      limit, 
      includeLocation: true 
    });
    
    // 保持原有的返回格式
    return result.history.map(record => ({
      id: record.id,
      loginAt: record.loginAt,
      ip: record.ip,
      fingerprint: record.fingerprint,
      userAgent: record.userAgent,
      location: record.location,
      success: record.success,
      failReason: record.failReason
    }));
  } catch (error) {
    console.error('[LoginHistory] 兼容接口获取登录历史失败:', error);
    throw error;
  }
}

// 导出服务实例以供高级用法
export { loginHistoryService }; 