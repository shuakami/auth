/**
 * 登录历史服务
 * 提供登录历史记录、查询、统计和分析功能
 */
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../db/index.js';
import { encrypt, decrypt } from '../../auth/cryptoUtils.js';

export class LoginHistoryService {
  /**
   * 记录登录历史
   * @param {Object} loginData 登录数据
   * @returns {Promise<string>} 记录ID
   */
  async recordLogin(loginData) {
    const {
      userId,
      ip,
      fingerprint,
      userAgent,
      location,
      success,
      failReason,
      loginMethod = 'password', // password, oauth, 2fa
      deviceType = 'unknown' // web, mobile, api
    } = loginData;

    try {
      const recordId = uuidv4();
      const ipEnc = ip ? encrypt(ip) : null;
      const fingerprintEnc = fingerprint ? encrypt(fingerprint) : null;
      const locationJson = location ? JSON.stringify(location) : null;

      await pool.query(
        `INSERT INTO login_history (
          id, user_id, login_at, ip_enc, fingerprint_enc, user_agent, 
          location, success, fail_reason, login_method, device_type
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          recordId, userId, ipEnc, fingerprintEnc, userAgent,
          locationJson, success, failReason, loginMethod, deviceType
        ]
      );

      console.log(`[LoginHistory] 记录登录历史: 用户=${userId}, 成功=${success}, 方法=${loginMethod}`);
      return recordId;

    } catch (error) {
      console.error('[LoginHistory] 记录登录历史失败:', error);
      throw new Error('记录登录历史失败');
    }
  }

  /**
   * 获取用户登录历史
   * @param {string} userId 用户ID
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getLoginHistory(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      startDate = null,
      endDate = null,
      successOnly = false,
      includeLocation = true,
      loginMethod = null
    } = options;

    try {
      let query = `
        SELECT id, login_at, ip_enc, fingerprint_enc, user_agent, location, 
               success, fail_reason, login_method, device_type
        FROM login_history 
        WHERE user_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;

      // 添加过滤条件
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

      if (loginMethod) {
        query += ` AND login_method = $${paramIndex}`;
        params.push(loginMethod);
        paramIndex++;
      }

      query += ` ORDER BY login_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      // 执行查询
      const { rows } = await pool.query(query, params);

      // 格式化结果
      const formattedHistory = rows.map(row => this._formatHistoryRecord(row, includeLocation));

      // 获取总数
      const totalCount = await this._getHistoryCount(userId, { startDate, endDate, successOnly, loginMethod });

      return {
        history: formattedHistory,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: totalCount > offset + limit
        }
      };

    } catch (error) {
      console.error('[LoginHistory] 获取登录历史失败:', error);
      throw new Error('获取登录历史失败');
    }
  }

  /**
   * 获取登录统计数据
   * @param {string} userId 用户ID
   * @param {Object} options 统计选项
   * @returns {Promise<Object>}
   */
  async getLoginStats(userId, options = {}) {
    const {
      days = 30,
      groupBy = 'day' // day, hour, method, device
    } = options;

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Promise.all([
        this._getBasicStats(userId, startDate),
        this._getLocationStats(userId, startDate),
        this._getDeviceStats(userId, startDate),
        this._getTimeSeriesStats(userId, startDate, groupBy),
        this._getFailureAnalysis(userId, startDate)
      ]);

      return {
        period: { days, startDate, endDate: new Date() },
        basic: stats[0],
        locations: stats[1],
        devices: stats[2],
        timeSeries: stats[3],
        failures: stats[4]
      };

    } catch (error) {
      console.error('[LoginHistory] 获取登录统计失败:', error);
      throw new Error('获取登录统计失败');
    }
  }

  /**
   * 检测异常登录模式
   * @param {string} userId 用户ID
   * @param {Object} options 检测选项
   * @returns {Promise<Object>}
   */
  async detectAnomalousPatterns(userId, options = {}) {
    const {
      timeWindow = 24 * 60 * 60 * 1000, // 24小时
      minEventsForAnalysis = 5
    } = options;

    try {
      const windowStart = new Date(Date.now() - timeWindow);

      // 获取时间窗口内的登录数据
      const { rows: recentLogins } = await pool.query(
        `SELECT login_at, ip_enc, user_agent, location, success, fail_reason, login_method
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2
         ORDER BY login_at DESC`,
        [userId, windowStart]
      );

      if (recentLogins.length < minEventsForAnalysis) {
        return {
          anomaliesDetected: false,
          reason: 'INSUFFICIENT_DATA',
          eventsAnalyzed: recentLogins.length
        };
      }

      const anomalies = [];

      // 1. 检测异常IP模式
      const ipAnomalies = await this._detectIPAnomalies(userId, recentLogins);
      if (ipAnomalies.length > 0) {
        anomalies.push(...ipAnomalies);
      }

      // 2. 检测异常时间模式
      const timeAnomalies = this._detectTimeAnomalies(recentLogins);
      if (timeAnomalies.length > 0) {
        anomalies.push(...timeAnomalies);
      }

      // 3. 检测失败模式
      const failureAnomalies = this._detectFailurePatterns(recentLogins);
      if (failureAnomalies.length > 0) {
        anomalies.push(...failureAnomalies);
      }

      // 4. 检测设备异常
      const deviceAnomalies = this._detectDeviceAnomalies(recentLogins);
      if (deviceAnomalies.length > 0) {
        anomalies.push(...deviceAnomalies);
      }

      return {
        anomaliesDetected: anomalies.length > 0,
        anomalies,
        eventsAnalyzed: recentLogins.length,
        timeWindow: timeWindow / (60 * 60 * 1000) // 转换为小时
      };

    } catch (error) {
      console.error('[LoginHistory] 异常模式检测失败:', error);
      throw new Error('异常模式检测失败');
    }
  }

  /**
   * 清理旧的登录历史
   * @param {Object} options 清理选项
   * @returns {Promise<number>}
   */
  async cleanupOldHistory(options = {}) {
    const {
      retentionDays = 365, // 保留1年
      batchSize = 1000
    } = options;

    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await pool.query(
        `DELETE FROM login_history 
         WHERE login_at < $1 
         AND id IN (
           SELECT id FROM login_history 
           WHERE login_at < $1 
           LIMIT $2
         )`,
        [cutoffDate, batchSize]
      );

      const cleanedCount = result.rowCount;
      
      if (cleanedCount > 0) {
        console.log(`[LoginHistory] 清理了 ${cleanedCount} 条过期登录历史记录`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('[LoginHistory] 清理历史记录失败:', error);
      return 0;
    }
  }

  /**
   * 格式化历史记录
   * @param {Object} row 数据库行
   * @param {boolean} includeLocation 是否包含位置信息
   * @returns {Object}
   * @private
   */
  _formatHistoryRecord(row, includeLocation = true) {
    const formatted = {
      id: row.id,
      loginAt: row.login_at,
      ip: this._decryptField(row.ip_enc),
      fingerprint: this._decryptField(row.fingerprint_enc),
      userAgent: row.user_agent,
      success: row.success,
      failReason: row.fail_reason,
      loginMethod: row.login_method || 'password',
      deviceType: row.device_type || 'unknown'
    };

    if (includeLocation && row.location) {
      try {
        formatted.location = typeof row.location === 'string' 
          ? JSON.parse(row.location) 
          : row.location;
      } catch (error) {
        console.warn('[LoginHistory] 解析位置信息失败:', error);
        formatted.location = null;
      }
    }

    return formatted;
  }

  /**
   * 解密字段
   * @param {string} encryptedField 加密字段
   * @returns {string|null}
   * @private
   */
  _decryptField(encryptedField) {
    if (!encryptedField) return null;

    try {
      return decrypt(encryptedField);
    } catch (error) {
      console.warn('[LoginHistory] 解密字段失败:', error);
      return null;
    }
  }

  /**
   * 获取历史记录总数
   * @param {string} userId 用户ID
   * @param {Object} filters 过滤条件
   * @returns {Promise<number>}
   * @private
   */
  async _getHistoryCount(userId, filters) {
    try {
      let query = 'SELECT COUNT(*) as count FROM login_history WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (filters.startDate) {
        query += ` AND login_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND login_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.successOnly) {
        query += ` AND success = TRUE`;
      }

      if (filters.loginMethod) {
        query += ` AND login_method = $${paramIndex}`;
        params.push(filters.loginMethod);
      }

      const { rows } = await pool.query(query, params);
      return parseInt(rows[0].count);

    } catch (error) {
      console.error('[LoginHistory] 获取历史记录总数失败:', error);
      return 0;
    }
  }

  /**
   * 获取基本统计
   * @param {string} userId 用户ID
   * @param {Date} startDate 开始日期
   * @returns {Promise<Object>}
   * @private
   */
  async _getBasicStats(userId, startDate) {
    try {
      const { rows } = await pool.query(
        `SELECT 
           COUNT(*) as total_attempts,
           COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_logins,
           COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_attempts,
           COUNT(DISTINCT DATE(login_at)) as active_days,
           COUNT(DISTINCT ip_enc) as unique_ips,
           COUNT(DISTINCT user_agent) as unique_devices
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2`,
        [userId, startDate]
      );

      const stats = rows[0];
      const successRate = stats.total_attempts > 0 
        ? (parseInt(stats.successful_logins) / parseInt(stats.total_attempts) * 100).toFixed(2)
        : 0;

      return {
        totalAttempts: parseInt(stats.total_attempts),
        successfulLogins: parseInt(stats.successful_logins),
        failedAttempts: parseInt(stats.failed_attempts),
        successRate: parseFloat(successRate),
        activeDays: parseInt(stats.active_days),
        uniqueIPs: parseInt(stats.unique_ips),
        uniqueDevices: parseInt(stats.unique_devices)
      };

    } catch (error) {
      console.error('[LoginHistory] 获取基本统计失败:', error);
      return {};
    }
  }

  /**
   * 获取位置统计
   * @param {string} userId 用户ID
   * @param {Date} startDate 开始日期
   * @returns {Promise<Array>}
   * @private
   */
  async _getLocationStats(userId, startDate) {
    try {
      const { rows } = await pool.query(
        `SELECT location, COUNT(*) as count
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2 AND success = TRUE AND location IS NOT NULL
         GROUP BY location
         ORDER BY count DESC
         LIMIT 10`,
        [userId, startDate]
      );

      return rows.map(row => {
        try {
          const location = typeof row.location === 'string' 
            ? JSON.parse(row.location) 
            : row.location;
          return {
            location,
            count: parseInt(row.count)
          };
        } catch {
          return null;
        }
      }).filter(Boolean);

    } catch (error) {
      console.error('[LoginHistory] 获取位置统计失败:', error);
      return [];
    }
  }

  /**
   * 获取设备统计
   * @param {string} userId 用户ID
   * @param {Date} startDate 开始日期
   * @returns {Promise<Array>}
   * @private
   */
  async _getDeviceStats(userId, startDate) {
    try {
      const { rows } = await pool.query(
        `SELECT user_agent, login_method, device_type, COUNT(*) as count,
                MAX(login_at) as last_used
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2 AND success = TRUE
         GROUP BY user_agent, login_method, device_type
         ORDER BY count DESC, last_used DESC
         LIMIT 10`,
        [userId, startDate]
      );

      return rows.map(row => ({
        userAgent: row.user_agent,
        loginMethod: row.login_method,
        deviceType: row.device_type,
        count: parseInt(row.count),
        lastUsed: row.last_used
      }));

    } catch (error) {
      console.error('[LoginHistory] 获取设备统计失败:', error);
      return [];
    }
  }

  /**
   * 获取时间序列统计
   * @param {string} userId 用户ID
   * @param {Date} startDate 开始日期
   * @param {string} groupBy 分组方式
   * @returns {Promise<Array>}
   * @private
   */
  async _getTimeSeriesStats(userId, startDate, groupBy) {
    try {
      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = "DATE_TRUNC('hour', login_at)";
          break;
        case 'day':
        default:
          dateFormat = "DATE_TRUNC('day', login_at)";
          break;
      }

      const { rows } = await pool.query(
        `SELECT ${dateFormat} as time_bucket,
                COUNT(*) as total_attempts,
                COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_logins,
                COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_attempts
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2
         GROUP BY time_bucket
         ORDER BY time_bucket`,
        [userId, startDate]
      );

      return rows.map(row => ({
        time: row.time_bucket,
        totalAttempts: parseInt(row.total_attempts),
        successfulLogins: parseInt(row.successful_logins),
        failedAttempts: parseInt(row.failed_attempts)
      }));

    } catch (error) {
      console.error('[LoginHistory] 获取时间序列统计失败:', error);
      return [];
    }
  }

  /**
   * 获取失败分析
   * @param {string} userId 用户ID
   * @param {Date} startDate 开始日期
   * @returns {Promise<Object>}
   * @private
   */
  async _getFailureAnalysis(userId, startDate) {
    try {
      const { rows } = await pool.query(
        `SELECT fail_reason, COUNT(*) as count
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2 AND success = FALSE AND fail_reason IS NOT NULL
         GROUP BY fail_reason
         ORDER BY count DESC`,
        [userId, startDate]
      );

      return {
        byReason: rows.map(row => ({
          reason: row.fail_reason,
          count: parseInt(row.count)
        })),
        totalFailures: rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      };

    } catch (error) {
      console.error('[LoginHistory] 获取失败分析失败:', error);
      return { byReason: [], totalFailures: 0 };
    }
  }

  /**
   * 检测IP异常
   * @param {string} userId 用户ID
   * @param {Array} recentLogins 最近登录记录
   * @returns {Promise<Array>}
   * @private
   */
  async _detectIPAnomalies(userId, recentLogins) {
    const anomalies = [];
    
    // 获取用户历史常用IP
    const { rows: historicalIPs } = await pool.query(
      `SELECT ip_enc, COUNT(*) as usage_count
       FROM login_history
       WHERE user_id = $1 AND success = TRUE AND login_at < NOW() - INTERVAL '7 days'
       GROUP BY ip_enc
       HAVING COUNT(*) >= 3
       ORDER BY usage_count DESC`,
      [userId]
    );

    const knownIPs = new Set(historicalIPs.map(row => row.ip_enc));
    
    // 检测新IP
    const newIPs = recentLogins
      .filter(login => login.ip_enc && !knownIPs.has(login.ip_enc))
      .map(login => login.ip_enc);

    if (newIPs.length > 0) {
      anomalies.push({
        type: 'NEW_IP_ADDRESSES',
        severity: 'MEDIUM',
        count: newIPs.length,
        details: `检测到 ${newIPs.length} 个新的IP地址`
      });
    }

    return anomalies;
  }

  /**
   * 检测时间异常
   * @param {Array} recentLogins 最近登录记录
   * @returns {Array}
   * @private
   */
  _detectTimeAnomalies(recentLogins) {
    const anomalies = [];
    
    // 检测异常时间段登录（深夜登录）
    const nightLogins = recentLogins.filter(login => {
      const hour = new Date(login.login_at).getHours();
      return hour >= 2 && hour <= 5; // 凌晨2点到5点
    });

    if (nightLogins.length > 2) {
      anomalies.push({
        type: 'UNUSUAL_TIME_PATTERN',
        severity: 'LOW',
        count: nightLogins.length,
        details: `检测到 ${nightLogins.length} 次深夜登录（2-5点）`
      });
    }

    return anomalies;
  }

  /**
   * 检测失败模式
   * @param {Array} recentLogins 最近登录记录
   * @returns {Array}
   * @private
   */
  _detectFailurePatterns(recentLogins) {
    const anomalies = [];
    
    const failedLogins = recentLogins.filter(login => !login.success);
    const totalLogins = recentLogins.length;
    
    if (totalLogins > 5 && failedLogins.length / totalLogins > 0.5) {
      anomalies.push({
        type: 'HIGH_FAILURE_RATE',
        severity: 'HIGH',
        failureRate: (failedLogins.length / totalLogins * 100).toFixed(2),
        details: `失败率过高：${failedLogins.length}/${totalLogins}`
      });
    }

    return anomalies;
  }

  /**
   * 检测设备异常
   * @param {Array} recentLogins 最近登录记录
   * @returns {Array}
   * @private
   */
  _detectDeviceAnomalies(recentLogins) {
    const anomalies = [];
    
    const uniqueUserAgents = new Set(
      recentLogins.map(login => login.user_agent).filter(Boolean)
    );

    if (uniqueUserAgents.size > 5) {
      anomalies.push({
        type: 'MULTIPLE_DEVICES',
        severity: 'MEDIUM',
        deviceCount: uniqueUserAgents.size,
        details: `检测到 ${uniqueUserAgents.size} 个不同设备`
      });
    }

    return anomalies;
  }
}