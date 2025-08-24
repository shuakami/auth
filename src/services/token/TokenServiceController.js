/**
 * Token服务控制器 - 协调各种Token相关服务
 */
import { RefreshTokenService } from './RefreshTokenService.js';
import { TokenSecurityService } from './TokenSecurityService.js';
import { SessionService } from './SessionService.js';
import { SessionHistoryService } from './SessionHistoryService.js';

export class TokenServiceController {
  constructor() {
    this.tokenService = new RefreshTokenService();
    this.securityService = new TokenSecurityService();
    this.sessionService = new SessionService();
    this.historyService = new SessionHistoryService();
  }

  /**
   * 创建新的Refresh Token
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息
   * @param {string|null} clientId 客户端ID
   * @param {string|null} parentId 父Token ID
   * @param {number} expiresIn 过期时间（秒）
   * @returns {Promise<Object>}
   */
  async createRefreshToken(userId, deviceInfo, clientId = null, parentId = null, expiresIn = 60 * 60 * 24 * 15) {
    // 1. 检测异常活动
    try {
      const anomalyReport = await this.securityService.detectAnomalousActivity(userId);
      if (anomalyReport.anomaliesDetected) {
        console.warn(`[TokenController] 用户${userId}检测到异常活动:`, anomalyReport.anomalies);
        
        // 根据建议执行安全措施
        if (anomalyReport.recommendation === 'REVOKE_ALL_USER_TOKENS') {
          await this.tokenService.revokeAllUserTokens(userId);
          throw new Error('检测到安全风险，已吊销所有Token，请重新登录');
        }
      }
    } catch (error) {
      // 安全检测失败不应阻断Token创建，但要记录
      console.error('[TokenController] 安全检测失败:', error);
    }

    // 2. 如果有父Token，检测重用攻击
    if (parentId) {
      try {
        const reuseReport = await this.securityService.detectTokenReuse(parentId);
        if (reuseReport.reused) {
          console.error(`[TokenController] 检测到Token重用攻击:`, reuseReport);
          await this.tokenService.revokeAllUserTokens(userId);
          throw new Error('检测到Token重用攻击，已吊销所有Token');
        }
      } catch (error) {
        console.error('[TokenController] Token重用检测失败:', error);
      }
    }

    // 3. 创建新Token
    return this.tokenService.createToken(userId, deviceInfo, clientId, parentId, expiresIn);
  }

  /**
   * 验证Refresh Token
   * @param {string} token Token字符串
   * @returns {Promise<Object>}
   */
  async validateRefreshToken(token) {
    return this.tokenService.validateToken(token);
  }

  /**
   * 轮换Refresh Token
   * @param {string} oldToken 旧Token
   * @param {string} deviceInfo 设备信息
   * @returns {Promise<Object>}
   */
  async rotateRefreshToken(oldToken, deviceInfo) {
    return this.tokenService.rotateToken(oldToken, deviceInfo);
  }

  /**
   * 吊销Token
   * @param {string} tokenId Token ID
   * @param {string} reason 吊销原因
   * @returns {Promise<void>}
   */
  async revokeRefreshTokenById(tokenId, reason = '') {
    return this.tokenService.revokeToken(tokenId, reason);
  }

  /**
   * 吊销用户所有Token
   * @param {string} userId 用户ID
   * @returns {Promise<void>}
   */
  async revokeAllRefreshTokensForUser(userId) {
    return this.tokenService.revokeAllUserTokens(userId);
  }

  /**
   * 获取用户活跃会话
   * @param {string} userId 用户ID
   * @returns {Promise<Array>}
   */
  async getActiveSessionsForUser(userId) {
    return this.sessionService.getActiveSessions(userId);
  }

  /**
   * 获取用户会话及聚合历史信息（性能优化版）
   * @param {string} userId 用户ID
   * @returns {Promise<Array>}
   */
  async getSessionAggregatedInfoForUser(userId) {
    return this.historyService.getSessionsWithHistory(userId);
  }

  /**
   * 检测Token重用
   * @param {string} parentId 父Token ID
   * @returns {Promise<boolean>}
   */
  async detectTokenReuse(parentId) {
    const result = await this.securityService.detectTokenReuse(parentId);
    return result.reused;
  }

  /**
   * 吊销其他会话（保留当前）
   * @param {string} userId 用户ID
   * @param {string} currentSessionId 当前会话ID
   * @returns {Promise<number>}
   */
  async revokeOtherSessions(userId, currentSessionId) {
    return this.sessionService.revokeOtherSessions(userId, currentSessionId);
  }

  /**
   * 获取会话统计信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getSessionStats(userId) {
    return this.sessionService.getSessionStats(userId);
  }

  /**
   * 获取会话详细历史
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getSessionHistory(userId, deviceInfo, options = {}) {
    return this.historyService.getSessionHistory(userId, deviceInfo, options);
  }

  /**
   * 执行安全维护任务
   * @param {Object} options 维护选项
   * @returns {Promise<Object>}
   */
  async performMaintenance(options = {}) {
    const { 
      cleanupExpired = true,
      batchSize = 1000 
    } = options;

    const results = {};

    try {
      if (cleanupExpired) {
        const cleaned = await this.sessionService.cleanupExpiredSessions(batchSize);
        results.expiredSessionsCleaned = cleaned;
      }

      console.log('[TokenController] 维护任务完成:', results);
      return results;

    } catch (error) {
      console.error('[TokenController] 维护任务失败:', error);
      throw new Error('维护任务执行失败');
    }
  }
}