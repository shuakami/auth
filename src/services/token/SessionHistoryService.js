/**
 * 会话历史服务 - 处理会话历史数据聚合和查询
 */
import { smartQuery } from '../../db/index.js';
import { decrypt } from '../../auth/cryptoUtils.js';

/**
 * 轻量级 LRU 缓存：避免重复解密/JSON 解析导致的 CPU 开销
 * - 无第三方依赖，部署安全
 * - 模块级常驻，Vercel 同容器后续请求可复用（冷启动后重建）
 */
class SimpleLRU {
  /**
   * @param {number} capacity 容量上限
   */
  constructor(capacity = 1024) {
    this.capacity = capacity;
    this.map = new Map();
  }
  /**
   * @param {string} key
   * @returns {any|undefined}
   */
  get(key) {
    if (!key || !this.map.has(key)) return undefined;
    const val = this.map.get(key);
    // 刷新最近使用
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  /**
   * @param {string} key
   * @param {any} value
   */
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

/** 解密与位置解析缓存（容量可按业务量调整） */
const decryptCache = new SimpleLRU(8192);
const locationCache = new SimpleLRU(4096);

export class SessionHistoryService {
  /**
   * 获取用户所有活跃会话及其聚合历史信息（性能优化版）
   * - 接口与字段保持原样，不改变业务语义
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

      // 2. 使用单次 SQL 聚合获取所有会话的最新/最早时间与最新 IP/位置（仅每设备 1 行）
      const historyMap = await this._getHistoryForSessions(userId, sessions);

      // 3. 合并
      const result = sessions.map((session) => {
        const aggregated = historyMap[session.device_info] || {
          firstLoginAt: null,
          lastLoginAt: null,
          lastLocation: null,
          lastIp: null,
          lastUserAgent: null,
        };
        return { ...session, ...aggregated };
      });

      console.log(
        `[SessionHistory] 用户${userId}获取到${result.length}个会话及其历史`
      );
      return result;
    } catch (error) {
      console.error('[SessionHistory] 获取会话历史失败:', error);
      throw new Error('获取会话历史失败');
    }
  }

  /**
   * 获取指定会话的详细历史（接口不变）
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息（这里等价于 login_history.user_agent）
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getSessionHistory(userId, deviceInfo, options = {}) {
    const {
      limit = 50,
      offset = 0,
      startDate = null,
      endDate = null,
      successOnly = false,
    } = options;

    try {
      let query = `
        SELECT login_at, ip_enc, fingerprint_enc, user_agent, location, success,
               fail_reason AS reason
        FROM login_history
        WHERE user_id = $1 AND user_agent = $2
      `;

      const params = [userId, deviceInfo];
      let paramIndex = 3;

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

      const { rows } = await smartQuery(query, params);

      // 解密和格式化数据（保持返回字段与原实现一致）
      const formattedHistory = rows.map((row) => this._formatHistoryRecord(row));

      return {
        history: formattedHistory,
        // total 和 hasMore 保持原来的语义：不做总量扫描，保证兼容
        total: formattedHistory.length,
        hasMore: formattedHistory.length === limit,
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

      const { rows } = await smartQuery(
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
        period: { start: startDate, end: new Date() },
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
    const { rows } = await smartQuery(
      `SELECT id, device_info, created_at, last_used_at, expires_at, revoked
       FROM refresh_tokens
       WHERE user_id = $1 AND revoked = FALSE AND expires_at > $2
       ORDER BY created_at DESC`,
      [userId, now]
    );
    return rows;
  }

  /**
   * 批量获取会话聚合历史（单次 SQL，按设备 1 行）
   * @param {string} userId 
   * @param {Array} sessions 
   * @returns {Promise<Object>} { [device_info]: { firstLoginAt, lastLoginAt, lastLocation, lastIp, lastUserAgent } }
   * @private
   */
  async _getHistoryForSessions(userId, sessions) {
    const deviceInfos = sessions.map((s) => s.device_info);
    if (deviceInfos.length === 0) return {};

    // 使用窗口函数在数据库侧聚合出每个 user_agent 的最早/最新登录时间及“最新行”的 IP/位置
    const { rows } = await smartQuery(
      `
      WITH ranked AS (
        SELECT
          user_agent,
          login_at,
          ip_enc,
          location,
          ROW_NUMBER() OVER (PARTITION BY user_agent ORDER BY login_at DESC) AS rn_desc,
          ROW_NUMBER() OVER (PARTITION BY user_agent ORDER BY login_at ASC)  AS rn_asc
        FROM login_history
        WHERE user_id = $1
          AND user_agent = ANY($2::text[])
          AND success = TRUE
      )
      SELECT
        user_agent,
        MAX(CASE WHEN rn_asc  = 1 THEN login_at END) AS first_login_at,
        MAX(CASE WHEN rn_desc = 1 THEN login_at END) AS last_login_at,
        MAX(CASE WHEN rn_desc = 1 THEN ip_enc   END) AS last_ip_enc,
        MAX(CASE WHEN rn_desc = 1 THEN location::text END) AS last_location
      FROM ranked
      GROUP BY user_agent
      `,
      [userId, deviceInfos]
    );

    const historyMap = Object.create(null);
    for (const row of rows) {
      historyMap[row.user_agent] = {
        firstLoginAt: row.first_login_at || null,
        lastLoginAt: row.last_login_at || null,
        lastLocation: this._parseLocation(row.last_location),
        lastIp: this._decryptField(row.last_ip_enc),
        lastUserAgent: row.user_agent,
      };
    }

    return historyMap;
  }

  /**
   * 聚合历史数据（保留用于空历史场景的兜底）
   * @param {Array} history 
   * @returns {Object}
   * @private
   */
  _aggregateHistoryData(history) {
    if (!history || history.length === 0) {
      return {
        firstLoginAt: null,
        lastLoginAt: null,
        lastLocation: null,
        lastIp: null,
        lastUserAgent: null,
      };
    }
    // 若使用了数据库聚合，一般不会走到这里
    const latest = history[0];
    const earliest = history[history.length - 1];

    return {
      firstLoginAt: earliest.login_at,
      lastLoginAt: latest.login_at,
      lastLocation: this._parseLocation(latest.location),
      lastIp: this._decryptField(latest.ip_enc),
      lastUserAgent: latest.user_agent,
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
      reason: record.reason,
    };
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
      console.warn('[SessionHistory] 解析位置信息失败:', error);
      return null;
    }
  }

  /**
   * 解密字段（带缓存）
   * @param {string} encryptedField 
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
      console.warn('[SessionHistory] 解密字段失败:', error);
      return null;
    }
  }
}
