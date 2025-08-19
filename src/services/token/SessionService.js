/**
 * 会话管理服务 - 处理用户会话的查询和管理
 */
import { smartQuery, smartConnect } from '../../db/index.js';

export class SessionService {
  /**
   * 获取用户所有活跃会话
   * @param {string} userId 用户ID
   * @returns {Promise<Array>}
   */
  async getActiveSessions(userId) {
    try {
      const now = new Date();
      const { rows } = await smartQuery(
        `SELECT id, device_info, created_at, last_used_at, expires_at, revoked
         FROM refresh_tokens
         WHERE user_id = $1 AND revoked = FALSE AND expires_at > $2
         ORDER BY created_at DESC`,
        [userId, now]
      );

      console.log(`[Session] 用户${userId}获取到${rows.length}个活跃会话`);
      return rows;
      
    } catch (error) {
      console.error('[Session] 获取活跃会话失败:', error);
      throw new Error('获取活跃会话失败');
    }
  }

  /**
   * 获取会话详细信息
   * @param {string} sessionId 会话ID
   * @returns {Promise<Object|null>}
   */
  async getSessionDetails(sessionId) {
    try {
      const { rows } = await smartQuery(
        `SELECT * FROM refresh_tokens WHERE id = $1`,
        [sessionId]
      );

      return rows[0] || null;
      
    } catch (error) {
      console.error('[Session] 获取会话详情失败:', error);
      throw new Error('获取会话详情失败');
    }
  }

  /**
   * 更新会话最后使用时间
   * @param {string} sessionId 会话ID
   * @returns {Promise<void>}
   */
  async updateLastUsed(sessionId) {
    try {
      const now = new Date();
      await smartQuery(
        'UPDATE refresh_tokens SET last_used_at = $1 WHERE id = $2',
        [now, sessionId]
      );
      
    } catch (error) {
      console.error('[Session] 更新会话使用时间失败:', error);
      // 这个错误不应该阻断主流程，只记录日志
    }
  }

  /**
   * 吊销指定会话
   * @param {string} sessionId 会话ID
   * @param {string} reason 吊销原因
   * @returns {Promise<boolean>}
   */
  async revokeSession(sessionId, reason = '') {
    try {
      const result = await smartQuery(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1 AND revoked = FALSE',
        [sessionId]
      );

      const success = result.rowCount > 0;
      
      if (success) {
        console.log(`[Session] 会话${sessionId}已吊销，原因: ${reason}`);
      } else {
        console.warn(`[Session] 会话${sessionId}吊销失败，可能已被吊销或不存在`);
      }

      return success;
      
    } catch (error) {
      console.error('[Session] 吊销会话失败:', error);
      throw new Error('吊销会话失败');
    }
  }

  /**
   * 吊销其他会话（保留当前会话）
   * @param {string} userId 用户ID
   * @param {string} currentSessionId 当前会话ID
   * @returns {Promise<number>}
   */
  async revokeOtherSessions(userId, currentSessionId) {
    try {
      const result = await smartQuery(
        `UPDATE refresh_tokens 
         SET revoked = TRUE 
         WHERE user_id = $1 AND id != $2 AND revoked = FALSE`,
        [userId, currentSessionId]
      );

      console.log(`[Session] 用户${userId}的其他会话已吊销，共${result.rowCount}个`);
      return result.rowCount;
      
    } catch (error) {
      console.error('[Session] 吊销其他会话失败:', error);
      throw new Error('吊销其他会话失败');
    }
  }

  /**
   * 获取会话统计信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getSessionStats(userId) {
    try {
      const { rows } = await smartQuery(
        `SELECT 
           COUNT(*) as total_sessions,
           COUNT(CASE WHEN revoked = FALSE AND expires_at > NOW() THEN 1 END) as active_sessions,
           COUNT(CASE WHEN revoked = TRUE THEN 1 END) as revoked_sessions,
           COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_sessions,
           COUNT(DISTINCT device_info) as unique_devices,
           MIN(created_at) as first_session,
           MAX(last_used_at) as last_activity
         FROM refresh_tokens 
         WHERE user_id = $1`,
        [userId]
      );

      const stats = rows[0];
      
      // 转换数值字段
      Object.keys(stats).forEach(key => {
        if (key.includes('sessions') || key.includes('devices')) {
          stats[key] = parseInt(stats[key]) || 0;
        }
      });

      return stats;
      
    } catch (error) {
      console.error('[Session] 获取会话统计失败:', error);
      throw new Error('获取会话统计失败');
    }
  }

  /**
   * 清理过期会话
   * @param {number} batchSize 批次大小
   * @returns {Promise<number>}
   */
  async cleanupExpiredSessions(batchSize = 1000) {
    try {
      const now = new Date();
      const result = await smartQuery(
        `DELETE FROM refresh_tokens 
         WHERE expires_at < $1 
         LIMIT $2`,
        [now, batchSize]
      );

      if (result.rowCount > 0) {
        console.log(`[Session] 清理了${result.rowCount}个过期会话`);
      }

      return result.rowCount;
      
    } catch (error) {
      console.error('[Session] 清理过期会话失败:', error);
      throw new Error('清理过期会话失败');
    }
  }

  /**
   * 按设备分组获取会话
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getSessionsByDevice(userId) {
    try {
      const { rows } = await smartQuery(
        `SELECT device_info, 
                COUNT(*) as session_count,
                MAX(created_at) as latest_session,
                MAX(last_used_at) as last_activity,
                COUNT(CASE WHEN revoked = FALSE AND expires_at > NOW() THEN 1 END) as active_count
         FROM refresh_tokens 
         WHERE user_id = $1
         GROUP BY device_info
         ORDER BY latest_session DESC`,
        [userId]
      );

      return rows.reduce((acc, row) => {
        acc[row.device_info] = {
          sessionCount: parseInt(row.session_count),
          latestSession: row.latest_session,
          lastActivity: row.last_activity,
          activeCount: parseInt(row.active_count)
        };
        return acc;
      }, {});
      
    } catch (error) {
      console.error('[Session] 按设备分组获取会话失败:', error);
      throw new Error('按设备分组获取会话失败');
    }
  }
}