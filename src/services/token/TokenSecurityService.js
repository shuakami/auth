/**
 * Token安全服务 - 处理token安全检测和防护措施
 */
import { smartQuery, smartConnect } from '../../db/index.js';

export class TokenSecurityService {
  /**
   * 检测Token重用攻击
   * @param {string} parentId 父Token ID
   * @returns {Promise<Object>}
   */
  async detectTokenReuse(parentId) {
    try {
      const { rows } = await smartQuery(
        `SELECT id, user_id, created_at, device_info 
         FROM refresh_tokens 
         WHERE parent_id = $1 AND revoked = FALSE`,
        [parentId]
      );

      const isReused = rows.length > 1;
      
      if (isReused) {
        console.warn(`[TokenSecurity] 检测到Token重用攻击, parentId: ${parentId}, 重用次数: ${rows.length}`);
        
        return {
          reused: true,
          reuseCount: rows.length,
          suspiciousTokens: rows,
          recommendation: 'REVOKE_ALL_USER_TOKENS'
        };
      }

      return { reused: false };

    } catch (error) {
      console.error('[TokenSecurity] Token重用检测失败:', error);
      throw new Error('Token重用检测失败');
    }
  }

  /**
   * 检测异常Token活动
   * @param {string} userId 用户ID
   * @param {Object} options 检测选项
   * @returns {Promise<Object>}
   */
  async detectAnomalousActivity(userId, options = {}) {
    const {
      timeWindow = 24 * 60 * 60 * 1000, // 24小时
      maxTokensPerDevice = 5,
      maxDevicesPerUser = 10
    } = options;

    try {
      const windowStart = new Date(Date.now() - timeWindow);
      
      // 查询时间窗口内的Token活动
      const { rows: recentTokens } = await smartQuery(
        `SELECT device_info, COUNT(*) as token_count, 
                MIN(created_at) as first_seen, MAX(created_at) as last_seen
         FROM refresh_tokens 
         WHERE user_id = $1 AND created_at >= $2 AND revoked = FALSE
         GROUP BY device_info
         ORDER BY token_count DESC`,
        [userId, windowStart]
      );

      const anomalies = [];

      // 检测单设备Token过多
      const suspiciousDevices = recentTokens.filter(
        device => device.token_count > maxTokensPerDevice
      );
      
      if (suspiciousDevices.length > 0) {
        anomalies.push({
          type: 'EXCESSIVE_TOKENS_PER_DEVICE',
          details: suspiciousDevices,
          severity: 'HIGH'
        });
      }

      // 检测设备数量异常
      if (recentTokens.length > maxDevicesPerUser) {
        anomalies.push({
          type: 'EXCESSIVE_DEVICES',
          deviceCount: recentTokens.length,
          threshold: maxDevicesPerUser,
          severity: 'MEDIUM'
        });
      }

      // 检测快速Token创建
      const rapidCreation = recentTokens.filter(device => {
        const timeSpan = new Date(device.last_seen) - new Date(device.first_seen);
        return device.token_count > 3 && timeSpan < 5 * 60 * 1000; // 5分钟内多次创建
      });

      if (rapidCreation.length > 0) {
        anomalies.push({
          type: 'RAPID_TOKEN_CREATION',
          details: rapidCreation,
          severity: 'HIGH'
        });
      }

      return {
        anomaliesDetected: anomalies.length > 0,
        anomalies,
        tokenActivity: recentTokens,
        recommendation: this._generateSecurityRecommendation(anomalies)
      };

    } catch (error) {
      console.error('[TokenSecurity] 异常活动检测失败:', error);
      throw new Error('异常活动检测失败');
    }
  }

  /**
   * 执行安全措施
   * @param {string} userId 用户ID
   * @param {string} action 安全动作
   * @param {Object} context 上下文信息
   * @returns {Promise<Object>}
   */
  async executeSecurityAction(userId, action, context = {}) {
    try {
      switch (action) {
        case 'REVOKE_ALL_USER_TOKENS':
          return this._revokeAllUserTokens(userId, context);
          
        case 'REVOKE_SUSPICIOUS_TOKENS':
          return this._revokeSuspiciousTokens(userId, context);
          
        case 'RATE_LIMIT_USER':
          return this._rateLimitUser(userId, context);
          
        case 'ALERT_SECURITY_TEAM':
          return this._alertSecurityTeam(userId, context);
          
        default:
          throw new Error(`未知的安全动作: ${action}`);
      }
    } catch (error) {
      console.error('[TokenSecurity] 安全措施执行失败:', error);
      throw new Error('安全措施执行失败');
    }
  }

  /**
   * 生成安全建议
   * @param {Array} anomalies 异常列表
   * @returns {string}
   * @private
   */
  _generateSecurityRecommendation(anomalies) {
    if (anomalies.length === 0) {
      return 'NO_ACTION_REQUIRED';
    }

    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'HIGH');
    
    if (highSeverityAnomalies.length > 0) {
      return 'REVOKE_ALL_USER_TOKENS';
    }

    const mediumSeverityAnomalies = anomalies.filter(a => a.severity === 'MEDIUM');
    
    if (mediumSeverityAnomalies.length > 1) {
      return 'REVOKE_SUSPICIOUS_TOKENS';
    }

    return 'MONITOR_CLOSELY';
  }

  /**
   * 吊销用户所有Token
   * @param {string} userId 
   * @param {Object} context 
   * @returns {Promise<Object>}
   * @private
   */
  async _revokeAllUserTokens(userId, context) {
    const result = await smartQuery(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
      [userId]
    );

    console.log(`[TokenSecurity] 安全措施: 吊销用户${userId}所有Token，共${result.rowCount}个`);
    
    return {
      action: 'REVOKE_ALL_USER_TOKENS',
      tokensRevoked: result.rowCount,
      userId
    };
  }

  /**
   * 吊销可疑Token
   * @param {string} userId 
   * @param {Object} context 
   * @returns {Promise<Object>}
   * @private
   */
  async _revokeSuspiciousTokens(userId, context) {
    // 实现可疑Token的吊销逻辑
    // 这里可以根据具体的可疑特征来定制
    console.log(`[TokenSecurity] 安全措施: 吊销用户${userId}的可疑Token`);
    
    return {
      action: 'REVOKE_SUSPICIOUS_TOKENS',
      userId
    };
  }

  /**
   * 对用户进行速率限制
   * @param {string} userId 
   * @param {Object} context 
   * @returns {Promise<Object>}
   * @private
   */
  async _rateLimitUser(userId, context) {
    // 实现速率限制逻辑
    console.log(`[TokenSecurity] 安全措施: 对用户${userId}实施速率限制`);
    
    return {
      action: 'RATE_LIMIT_USER',
      userId
    };
  }

  /**
   * 通知安全团队
   * @param {string} userId 
   * @param {Object} context 
   * @returns {Promise<Object>}
   * @private
   */
  async _alertSecurityTeam(userId, context) {
    // 实现安全团队通知逻辑
    console.log(`[TokenSecurity] 安全措施: 通知安全团队关注用户${userId}`);
    
    return {
      action: 'ALERT_SECURITY_TEAM',
      userId
    };
  }
}