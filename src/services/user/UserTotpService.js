/**
 * 用户TOTP服务 - 处理用户的二步验证相关操作
 */
import { pool } from '../../db/index.js';

export class UserTotpService {
  /**
   * 设置TOTP密钥
   * @param {string} userId 用户ID
   * @param {string} secret TOTP密钥
   * @returns {Promise<boolean>}
   */
  async setTotpSecret(userId, secret) {
    try {
      if (!userId || !secret) {
        throw new Error('用户ID和TOTP密钥是必填字段');
      }

      const result = await pool.query(
        'UPDATE users SET totp_secret = $1, updated_at = NOW() WHERE id = $2',
        [secret, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('用户不存在');
      }

      console.log(`[UserTotpService] 用户 ${userId} TOTP密钥设置成功`);
      return true;

    } catch (error) {
      console.error('[UserTotpService] 设置TOTP密钥失败:', error);
      throw new Error(error.message || '设置TOTP密钥失败');
    }
  }

  /**
   * 启用TOTP
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async enableTotp(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      // 检查用户是否已设置TOTP密钥
      const { rows: userRows } = await pool.query(
        'SELECT totp_secret FROM users WHERE id = $1',
        [userId]
      );

      const user = userRows[0];
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.totp_secret) {
        throw new Error('请先设置TOTP密钥');
      }

      const result = await pool.query(
        'UPDATE users SET totp_enabled = TRUE, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      if (result.rowCount === 0) {
        throw new Error('启用TOTP失败');
      }

      console.log(`[UserTotpService] 用户 ${userId} TOTP启用成功`);
      return true;

    } catch (error) {
      console.error('[UserTotpService] 启用TOTP失败:', error);
      throw new Error(error.message || '启用TOTP失败');
    }
  }

  /**
   * 禁用TOTP
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async disableTotp(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 禁用TOTP并清除密钥
        await client.query(
          'UPDATE users SET totp_secret = NULL, totp_enabled = FALSE, updated_at = NOW() WHERE id = $1',
          [userId]
        );

        // 删除相关的备份码
        await client.query(
          'DELETE FROM backup_codes WHERE user_id = $1',
          [userId]
        );

        await client.query('COMMIT');

        console.log(`[UserTotpService] 用户 ${userId} TOTP禁用成功`);
        return true;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('[UserTotpService] 禁用TOTP失败:', error);
      throw new Error(error.message || '禁用TOTP失败');
    }
  }

  /**
   * 获取TOTP密钥
   * @param {string} userId 用户ID
   * @returns {Promise<string|null>}
   */
  async getTotpSecret(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await pool.query(
        'SELECT totp_secret FROM users WHERE id = $1',
        [userId]
      );

      const user = rows[0];
      return user ? user.totp_secret : null;

    } catch (error) {
      console.error('[UserTotpService] 获取TOTP密钥失败:', error);
      throw new Error('获取TOTP密钥失败');
    }
  }

  /**
   * 检查TOTP是否启用
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async isTotpEnabled(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await pool.query(
        'SELECT totp_enabled FROM users WHERE id = $1',
        [userId]
      );

      const user = rows[0];
      return user ? !!user.totp_enabled : false;

    } catch (error) {
      console.error('[UserTotpService] 检查TOTP状态失败:', error);
      throw new Error('检查TOTP状态失败');
    }
  }

  /**
   * 获取TOTP配置信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getTotpConfig(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await pool.query(
        `SELECT u.totp_enabled, u.totp_secret,
                COUNT(bc.id) as backup_codes_count
         FROM users u
         LEFT JOIN backup_codes bc ON u.id = bc.user_id AND bc.used = FALSE
         WHERE u.id = $1
         GROUP BY u.id, u.totp_enabled, u.totp_secret`,
        [userId]
      );

      const user = rows[0];
      if (!user) {
        throw new Error('用户不存在');
      }

      return {
        enabled: !!user.totp_enabled,
        hasSecret: !!user.totp_secret,
        backupCodesCount: parseInt(user.backup_codes_count) || 0
      };

    } catch (error) {
      console.error('[UserTotpService] 获取TOTP配置失败:', error);
      throw new Error('获取TOTP配置失败');
    }
  }
}