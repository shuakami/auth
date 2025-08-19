/**
 * 会话历史服务 - 处理会话历史数据聚合和查询，优化性能
 */
import { pool } from '../../db/index.js';
import { decrypt } from '../../auth/cryptoUtils.js';

export class SessionHistoryService {
  /**
   * 获取用户所有活跃会话及其聚合历史信息（性能优化版）
   * @param {string} userId 用户ID
   * @returns {Promise<Array>}
   */
  async getSessionsWithHistory(userId) {
    try {
      // 1. 获取所有活跃会话
      const sessions = await this._getActiveSessions(userId);
      
      if (sessions.length === 0) {
        return [];
      }

      // 2. 批量获取所有会话的历史数据（解决N+1问题）
      const historyMap = await this._getHistoryForSessions(userId, sessions);

      // 3. 合并会话和历史数据
      const result = sessions.map(session => {
        const history = historyMap[session.device_info] || [];
        const aggregatedData = this._aggregateHistoryData(history);

        return {
          ...session,
          ...aggregatedData
        };
      });

      console.log(`[SessionHistory] 用户${userId}获取到${result.length}个会话及其历史`);
      return result;

    } catch (error) {
      console.error('[SessionHistory] 获取会话历史失败:', error);
      throw new Error('获取会话历史失败');
    }
  }

  /**
   * 获取指定会话的详细历史
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getSessionHistory(userId, deviceInfo, options = {}) {
    const {
      limit = 50,
      offset = 0,
      startDate = null,
      endDate = null,
      successOnly = false
    } = options;

    try {
      let query = `
        SELECT login_at, ip_enc, fingerprint_enc, user_agent, location, success, reason
        FROM login_history
        WHERE user_id = $1 AND user_agent = $2
      `;
      
      const params = [userId, deviceInfo];
      let paramIndex = 3;

      // 添加条件过滤
      if (startDate) {
        query += ` AND login_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND login_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (successOnly) {
        query += ` AND success = TRUE`;
      }

      query += ` ORDER BY login_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const { rows } = await pool.query(query, params);

      // 解密和格式化数据
      const formattedHistory = rows.map(row => this._formatHistoryRecord(row));

      return {
        history: formattedHistory,
        total: formattedHistory.length,
        hasMore: formattedHistory.length === limit
      };

    } catch (error) {
      console.error('[SessionHistory] 获取会话历史失败:', error);
      throw new Error('获取会话历史失败');
    }
  }

  /**
   * 获取会话登录统计
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息
   * @param {number} days 统计天数
   * @returns {Promise<Object>}
   */
  async getSessionLoginStats(userId, deviceInfo, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { rows } = await pool.query(
        `SELECT 
           DATE(login_at) as login_date,
           COUNT(*) as total_attempts,
           COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_logins,
           COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_attempts,
           COUNT(DISTINCT CASE WHEN ip_enc IS NOT NULL THEN ip_enc END) as unique_ips
         FROM login_history
         WHERE user_id = $1 AND user_agent = $2 AND login_at >= $3
         GROUP BY DATE(login_at)
         ORDER BY login_date DESC`,
        [userId, deviceInfo, startDate]
      );

      return {
        dailyStats: rows,
        totalDays: days,
        period: { start: startDate, end: new Date() }
      };

    } catch (error) {
      console.error('[SessionHistory] 获取登录统计失败:', error);
      throw new Error('获取登录统计失败');
    }
  }

  /**
   * 获取活跃会话
   * @param {string} userId 
   * @returns {Promise<Array>}
   * @private
   */
  async _getActiveSessions(userId) {
    const now = new Date();
    const { rows } = await pool.query(
      `SELECT id, device_info, created_at, last_used_at, expires_at, revoked
       FROM refresh_tokens
       WHERE user_id = $1 AND revoked = FALSE AND expires_at > $2
       ORDER BY created_at DESC`,
      [userId, now]
    );
    return rows;
  }

  /**
   * 批量获取会话历史数据
   * @param {string} userId 
   * @param {Array} sessions 
   * @returns {Promise<Object>}
   * @private
   */
  async _getHistoryForSessions(userId, sessions) {
    const deviceInfos = sessions.map(s => s.device_info);
    
    // 使用 IN 查询批量获取所有历史数据
    const { rows } = await pool.query(
      `SELECT login_at, ip_enc, fingerprint_enc, user_agent, location, success, fail_reason
       FROM login_history
       WHERE user_id = $1 AND user_agent = ANY($2) AND success = TRUE
       ORDER BY user_agent, login_at DESC`,
      [userId, deviceInfos]
    );

    // 按设备信息分组
    const historyMap = {};
    rows.forEach(row => {
      if (!historyMap[row.user_agent]) {
        historyMap[row.user_agent] = [];
      }
      historyMap[row.user_agent].push(row);
    });

    return historyMap;
  }

  /**
   * 聚合历史数据
   * @param {Array} history 
   * @returns {Object}
   * @private
   */
  _aggregateHistoryData(history) {
    if (history.length === 0) {
      return {
        firstLoginAt: null,
        lastLoginAt: null,
        lastLocation: null,
        lastIp: null,
        lastUserAgent: null
      };
    }

    const latest = history[0];
    const earliest = history[history.length - 1];

    return {
      firstLoginAt: earliest.login_at,
      lastLoginAt: latest.login_at,
      lastLocation: this._parseLocation(latest.location),
      lastIp: this._decryptField(latest.ip_enc),
      lastUserAgent: latest.user_agent
    };
  }

  /**
   * 格式化历史记录
   * @param {Object} record 
   * @returns {Object}
   * @private
   */
  _formatHistoryRecord(record) {
    return {
      loginAt: record.login_at,
      ip: this._decryptField(record.ip_enc),
      fingerprint: this._decryptField(record.fingerprint_enc),
      userAgent: record.user_agent,
      location: this._parseLocation(record.location),
      success: record.success,
      reason: record.reason
    };
  }

  /**
   * 解析位置信息
   * @param {string|Object} location 
   * @returns {Object|null}
   * @private
   */
  _parseLocation(location) {
    if (!location) return null;

    try {
      return typeof location === 'string' 
        ? JSON.parse(location) 
        : location;
    } catch (error) {
      console.warn('[SessionHistory] 解析位置信息失败:', error);
      return null;
    }
  }

  /**
   * 解密字段
   * @param {string} encryptedField 
   * @returns {string|null}
   * @private
   */
  _decryptField(encryptedField) {
    if (!encryptedField) return null;

    try {
      return decrypt(encryptedField);
    } catch (error) {
      console.warn('[SessionHistory] 解密字段失败:', error);
      return null;
    }
  }
}