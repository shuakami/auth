/**
 * Token服务控制器 - 协调各种Token相关服务
 */
import { RefreshTokenService } from './RefreshTokenService.js';
import { TokenSecurityService } from './TokenSecurityService.js';
import { SessionService } from './SessionService.js';
import { SessionHistoryService } from './SessionHistoryService.js';

// 轻量级日志控制，减少 serverless I/O 负担
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };
function log(level, ...args) {
  if ((LOG_ORDER[level] || 999) >= (LOG_ORDER[LOG_LEVEL] || 20)) {
    // 仅在达到设定阈值时输出
    // eslint-disable-next-line no-console
    console[level](...args);
  }
}

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
  async createRefreshToken(
    userId,
    deviceInfo,
    clientId = null,
    parentId = null,
    expiresIn = 60 * 60 * 24 * 15
  ) {
    // 并发执行独立的安全检测，但严格保留原有优先级：异常活动优先，其次是重用攻击
    let anomalyReport = null;
    let reuseReport = null;

    // 并发发起
    const anomalyPromise = this.securityService
      .detectAnomalousActivity(userId)
      .then((r) => (anomalyReport = r))
      .catch((err) => {
        // 安全检测失败不应阻断Token创建，但要记录
        log('error', '[TokenController] 安全检测失败:', err);
      });

    const reusePromise = parentId
      ? this.securityService
          .detectTokenReuse(parentId)
          .then((r) => (reuseReport = r))
          .catch((err) => {
            log('error', '[TokenController] Token重用检测失败:', err);
          })
      : Promise.resolve();

    // 等待两项检测都到达已决状态（不抛出）
    await Promise.allSettled([anomalyPromise, reusePromise]);

    // 异常活动检测仅作监控信号：它统计「同一 device_info 在 24h 内的活跃 Token 数 /
    // 短时间内创建数」，但合法场景（同一浏览器反复登录、在 Passkey 与 Google+TOTP
    // 之间切换、多标签页并发刷新、测试期多次登录）会把同一 UA 的多次签发误判为
    // 高危并触发 REVOKE_ALL_USER_TOKENS，导致刚通过强鉴权的用户被连带吊销全部会话
    // （表现为「登录后立刻被退登 / Passkey 和 TOTP 互相冲突」）。
    //
    // 因此这里只记录、不再据此吊销任何会话，也不阻断本次合法登录的令牌签发。真正的
    // 刷新令牌重放/盗用防护由轮换链负责：rotateToken 的条件更新会对家族重放吊销整族，
    // /refresh 也会对同一 parentId 下的多活跃子令牌判定盗用。这些才是基于「令牌被重复
    // 使用」的强信号，而非「同设备登录次数」这种会误伤的量级启发式。
    if (anomalyReport && anomalyReport.anomaliesDetected) {
      log(
        'warn',
        `[TokenController] 用户${userId}检测到异常活动（仅监控，不吊销会话）:`,
        anomalyReport.anomalies
      );
    }

    // 创建期的重用检测同样不再连坐吊销全部会话：parentId 在轮换链外通常为空，
    // 真正的重放由 rotateToken / detectTokenReuse 在轮换与刷新时处理。
    if (parentId && reuseReport && reuseReport.reused) {
      log(
        'warn',
        `[TokenController] 创建期检测到同一父令牌存在多个活跃子令牌（仅监控）:`,
        reuseReport
      );
    }

    // 3. 创建新Token（逻辑保持不变）
    return this.tokenService.createToken(
      userId,
      deviceInfo,
      clientId,
      parentId,
      expiresIn
    );
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
    const { cleanupExpired = true, batchSize = 1000 } = options;

    const results = {};
    try {
      if (cleanupExpired) {
        const cleaned = await this.sessionService.cleanupExpiredSessions(
          batchSize
        );
        results.expiredSessionsCleaned = cleaned;
      }

      log('info', '[TokenController] 维护任务完成:', results);
      return results;
    } catch (error) {
      log('error', '[TokenController] 维护任务失败:', error);
      throw new Error('维护任务执行失败');
    }
  }
}
