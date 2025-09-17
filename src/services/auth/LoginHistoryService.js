/**
 * 登录历史服务 - 提供登录历史记录、查询、统计和分析功能
 */
import { v4 as uuidv4 } from 'uuid';
import { smartQuery } from '../../db/index.js';
import { encrypt, decrypt } from '../../auth/cryptoUtils.js';

/**
 * 轻量级 LRU 缓存（同 SessionHistoryService）
 */
class SimpleLRU {
  constructor(capacity = 1024) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!key || !this.map.has(key)) return undefined;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  set(key, value) {
    if (!key) return;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}

const decryptCache = new SimpleLRU(8192);
const locationCache = new SimpleLRU(4096);

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
      deviceType = 'unknown', // web, mobile, api
    } = loginData;

    try {
      const recordId = uuidv4();
      const ipEnc = ip ? encrypt(ip) : null;
      const fingerprintEnc = fingerprint ? encrypt(fingerprint) : null;
      const locationJson = location ? JSON.stringify(location) : null;

      await smartQuery(
        `INSERT INTO login_history (
          id, user_id, login_at, ip_enc, fingerprint_enc, user_agent, 
          location, success, fail_reason, login_method, device_type
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          recordId,
          userId,
          ipEnc,
          fingerprintEnc,
          userAgent,
          locationJson,
          success,
          failReason,
          loginMethod,
          deviceType,
        ]
      );

      console.log(
        `[LoginHistory] 记录登录历史: 用户=${userId}, 成功=${success}, 方法=${loginMethod}`
      );
      return recordId;
    } catch (error) {
      console.error('[LoginHistory] 记录登录历史失败:', error);
      throw new Error('记录登录历史失败');
    }
  }

  /**
   * 获取用户登录历史（单次查询同时返回总数，接口结构不变）
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
      loginMethod = null,
    } = options;

    try {
      let query = `
        SELECT id, login_at, ip_enc, fingerprint_enc, user_agent, location, 
               success, fail_reason, login_method, device_type,
               COUNT(*) OVER() AS total_count
        FROM login_history 
        WHERE user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

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

      const { rows } = await smartQuery(query, params);

      const totalCount =
        rows.length > 0 && rows[0].total_count != null
          ? parseInt(rows[0].total_count, 10)
          : 0;

      const formattedHistory = rows.map((row) =>
        this._formatHistoryRecord(row, includeLocation)
      );

      return {
        history: formattedHistory,
        pagination: {
          total: totalCount, // 与原接口一致：总数为满足过滤条件的总行数
          limit,
          offset,
          hasMore: totalCount > offset + limit,
        },
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
    const { days = 30, groupBy = 'day' } = options;

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Promise.all([
        this._getBasicStats(userId, startDate),
        this._getLocationStats(userId, startDate),
        this._getDeviceStats(userId, startDate),
        this._getTimeSeriesStats(userId, startDate, groupBy),
        this._getFailureAnalysis(userId, startDate),
      ]);

      return {
        period: { days, startDate, endDate: new Date() },
        basic: stats[0],
        locations: stats[1],
        devices: stats[2],
        timeSeries: stats[3],
        failures: stats[4],
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
    const { timeWindow = 24 * 60 * 60 * 1000, minEventsForAnalysis = 5 } =
      options;

    try {
      const windowStart = new Date(Date.now() - timeWindow);

      const { rows: recentLogins } = await smartQuery(
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
          eventsAnalyzed: recentLogins.length,
        };
      }

      const anomalies = [];

      const ipAnomalies = await this._detectIPAnomalies(userId, recentLogins);
      if (ipAnomalies.length > 0) anomalies.push(...ipAnomalies);

      const timeAnomalies = this._detectTimeAnomalies(recentLogins);
      if (timeAnomalies.length > 0) anomalies.push(...timeAnomalies);

      const failureAnomalies = this._detectFailurePatterns(recentLogins);
      if (failureAnomalies.length > 0) anomalies.push(...failureAnomalies);

      const deviceAnomalies = this._detectDeviceAnomalies(recentLogins);
      if (deviceAnomalies.length > 0) anomalies.push(...deviceAnomalies);

      return {
        anomaliesDetected: anomalies.length > 0,
        anomalies,
        eventsAnalyzed: recentLogins.length,
        timeWindow: timeWindow / (60 * 60 * 1000),
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
    const { retentionDays = 365, batchSize = 1000 } = options;

    try {
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      );

      const result = await smartQuery(
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
   * 格式化历史记录（保持字段命名与语义不变）
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
      deviceType: row.device_type || 'unknown',
    };

    if (includeLocation && row.location) {
      formatted.location = this._parseLocation(row.location);
    }

    return formatted;
  }

  /**
   * 解密字段（带缓存）
   * @param {string} encryptedField 加密字段
   * @returns {string|null}
   * @private
   */
  _decryptField(encryptedField) {
    if (!encryptedField) return null;

    const cached = decryptCache.get(encryptedField);
    if (cached !== undefined) return cached;

    try {
      const val = decrypt(encryptedField);
      decryptCache.set(encryptedField, val);
      return val;
    } catch (error) {
      console.warn('[LoginHistory] 解密字段失败:', error);
      return null;
    }
  }

  /**
   * 解析位置信息（带缓存）
   * @param {string|Object} location
   * @returns {Object|null}
   * @private
   */
  _parseLocation(location) {
    if (!location) return null;

    try {
      if (typeof location !== 'string') return location;
      const cached = locationCache.get(location);
      if (cached !== undefined) return cached;
      const parsed = JSON.parse(location);
      locationCache.set(location, parsed);
      return parsed;
    } catch (error) {
      console.warn('[LoginHistory] 解析位置信息失败:', error);
      return null;
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
      const { rows } = await smartQuery(
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
      const totalAttempts = parseInt(stats.total_attempts || 0, 10);
      const successfulLogins = parseInt(stats.successful_logins || 0, 10);
      const failedAttempts = parseInt(stats.failed_attempts || 0, 10);

      const successRate =
        totalAttempts > 0
          ? parseFloat(((successfulLogins / totalAttempts) * 100).toFixed(2))
          : 0;

      return {
        totalAttempts,
        successfulLogins,
        failedAttempts,
        successRate,
        activeDays: parseInt(stats.active_days || 0, 10),
        uniqueIPs: parseInt(stats.unique_ips || 0, 10),
        uniqueDevices: parseInt(stats.unique_devices || 0, 10),
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
      const { rows } = await smartQuery(
        `SELECT location, COUNT(*) as count
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2 AND success = TRUE AND location IS NOT NULL
         GROUP BY location
         ORDER BY count DESC
         LIMIT 10`,
        [userId, startDate]
      );

      return rows
        .map((row) => {
          try {
            const location =
              typeof row.location === 'string'
                ? this._parseLocation(row.location)
                : row.location;
            return {
              location,
              count: parseInt(row.count || 0, 10),
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
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
      const { rows } = await smartQuery(
        `SELECT user_agent, login_method, device_type, COUNT(*) as count,
                MAX(login_at) as last_used
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2 AND success = TRUE
         GROUP BY user_agent, login_method, device_type
         ORDER BY count DESC, last_used DESC
         LIMIT 10`,
        [userId, startDate]
      );

      return rows.map((row) => ({
        userAgent: row.user_agent,
        loginMethod: row.login_method,
        deviceType: row.device_type,
        count: parseInt(row.count || 0, 10),
        lastUsed: row.last_used,
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

      const { rows } = await smartQuery(
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

      return rows.map((row) => ({
        time: row.time_bucket,
        totalAttempts: parseInt(row.total_attempts || 0, 10),
        successfulLogins: parseInt(row.successful_logins || 0, 10),
        failedAttempts: parseInt(row.failed_attempts || 0, 10),
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
      const { rows } = await smartQuery(
        `SELECT fail_reason, COUNT(*) as count
         FROM login_history
         WHERE user_id = $1 AND login_at >= $2 AND success = FALSE AND fail_reason IS NOT NULL
         GROUP BY fail_reason
         ORDER BY count DESC`,
        [userId, startDate]
      );

      return {
        byReason: rows.map((row) => ({
          reason: row.fail_reason,
          count: parseInt(row.count || 0, 10),
        })),
        totalFailures: rows.reduce(
          (sum, row) => sum + parseInt(row.count || 0, 10),
          0
        ),
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

    const { rows: historicalIPs } = await smartQuery(
      `SELECT ip_enc, COUNT(*) as usage_count
       FROM login_history
       WHERE user_id = $1 AND success = TRUE AND login_at < NOW() - INTERVAL '7 days'
       GROUP BY ip_enc
       HAVING COUNT(*) >= 3
       ORDER BY usage_count DESC`,
      [userId]
    );

    const knownIPs = new Set(historicalIPs.map((row) => row.ip_enc));

    const newIPs = recentLogins
      .filter((login) => login.ip_enc && !knownIPs.has(login.ip_enc))
      .map((login) => login.ip_enc);

    if (newIPs.length > 0) {
      anomalies.push({
        type: 'NEW_IP_ADDRESSES',
        severity: 'MEDIUM',
        count: newIPs.length,
        details: `检测到 ${newIPs.length} 个新的IP地址`,
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

    const nightLogins = recentLogins.filter((login) => {
      const hour = new Date(login.login_at).getHours();
      return hour >= 2 && hour <= 5;
    });

    if (nightLogins.length > 2) {
      anomalies.push({
        type: 'UNUSUAL_TIME_PATTERN',
        severity: 'LOW',
        count: nightLogins.length,
        details: `检测到 ${nightLogins.length} 次深夜登录（2-5点）`,
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

    const failedLogins = recentLogins.filter((login) => !login.success);
    const totalLogins = recentLogins.length;

    if (totalLogins > 5 && failedLogins.length / totalLogins > 0.5) {
      anomalies.push({
        type: 'HIGH_FAILURE_RATE',
        severity: 'HIGH',
        failureRate: ((failedLogins.length / totalLogins) * 100).toFixed(2),
        details: `失败率过高：${failedLogins.length}/${totalLogins}`,
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
      recentLogins.map((login) => login.user_agent).filter(Boolean)
    );

    if (uniqueUserAgents.size > 5) {
      anomalies.push({
        type: 'MULTIPLE_DEVICES',
        severity: 'MEDIUM',
        deviceCount: uniqueUserAgents.size,
        details: `检测到 ${uniqueUserAgents.size} 个不同设备`,
      });
    }

    return anomalies;
  }
}
