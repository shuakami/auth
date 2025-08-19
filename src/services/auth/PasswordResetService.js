/**
 * 密码重置服务
 * 提供密码重置功能，包含安全防护和速率限制
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { pool } from '../../db/index.js';
import * as User from '../userService.js';
import { sendResetPasswordEmail } from '../../mail/resend.js';
import { PUBLIC_BASE_URL } from '../../config/env.js';
import { validatePassword } from '../../utils/passwordPolicy.js';

export class PasswordResetService {
  constructor() {
    this.DEFAULT_EXPIRY = 30 * 60 * 1000; // 30分钟
    this.MAX_REQUESTS_PER_HOUR = 3; // 每小时最多3次重置请求
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // 1小时清理一次过期token
  }

  /**
   * 创建密码重置令牌并发送邮件
   * @param {string} email 用户邮箱
   * @param {Object} options 选项
   * @returns {Promise<Object>}
   */
  async createResetToken(email, options = {}) {
    const { expiresIn = this.DEFAULT_EXPIRY, clientIP = null } = options;

    try {
      // 1. 验证用户是否存在
      const user = await User.findByEmail(email);
      if (!user) {
        // 为了安全，即使用户不存在也返回成功，避免邮箱枚举攻击
        console.log(`[PasswordReset] 重置请求失败：邮箱 ${email} 不存在`);
        return { 
          success: true, 
          message: '如果该邮箱已注册，您将收到重置密码的邮件' 
        };
      }

      // 2. 检查速率限制
      const rateLimitCheck = await this._checkRateLimit(user.id, clientIP);
      if (!rateLimitCheck.allowed) {
        throw new Error(`请求过于频繁，请 ${rateLimitCheck.waitMinutes} 分钟后再试`);
      }

      // 3. 生成安全令牌
      const token = this._generateSecureToken();
      const expiresAt = new Date(Date.now() + expiresIn);

      // 4. 存储令牌（先清理旧的）
      await this._storeToken(user.id, token, expiresAt, clientIP);

      // 5. 发送重置邮件
      const resetLink = `${PUBLIC_BASE_URL}/login/reset?token=${token}`;
      const emailSent = await sendResetPasswordEmail(email, resetLink);

      // 6. 记录重置请求
      await this._logResetRequest(user.id, token, clientIP, emailSent);

      console.log(`[PasswordReset] 用户 ${user.id} 的密码重置邮件已发送`);

      return {
        success: true,
        message: '重置密码的链接已发送到您的邮箱，请检查邮件（包括垃圾邮件文件夹）',
        emailSent,
        expiresIn: Math.floor(expiresIn / 1000 / 60) // 分钟
      };

    } catch (error) {
      console.error('[PasswordReset] 创建重置令牌失败:', error);
      throw new Error(error.message || '创建重置令牌失败');
    }
  }

  /**
   * 验证重置令牌
   * @param {string} token 重置令牌
   * @returns {Promise<Object|null>}
   */
  async verifyResetToken(token) {
    try {
      if (!token || token.length < 32) {
        return null;
      }

      const { rows } = await pool.query(
        `SELECT r.*, u.id as user_id, u.email, u.username 
         FROM password_reset_tokens r
         JOIN users u ON r.user_id = u.id
         WHERE r.token = $1 AND r.used = FALSE AND r.expires_at > NOW()`,
        [token]
      );

      const resetRecord = rows[0];
      if (!resetRecord) {
        console.warn(`[PasswordReset] 无效或过期的重置令牌: ${token.substring(0, 8)}...`);
        return null;
      }

      // 检查令牌使用次数（防止重放攻击）
      if (resetRecord.verification_count >= 5) {
        console.warn(`[PasswordReset] 重置令牌验证次数过多: ${token.substring(0, 8)}...`);
        await this._invalidateToken(resetRecord.id);
        return null;
      }

      // 更新验证次数
      await pool.query(
        'UPDATE password_reset_tokens SET verification_count = verification_count + 1 WHERE id = $1',
        [resetRecord.id]
      );

      return {
        user: {
          id: resetRecord.user_id,
          email: resetRecord.email,
          username: resetRecord.username
        },
        tokenInfo: {
          id: resetRecord.id,
          createdAt: resetRecord.created_at,
          expiresAt: resetRecord.expires_at,
          verificationCount: resetRecord.verification_count + 1
        }
      };

    } catch (error) {
      console.error('[PasswordReset] 验证重置令牌失败:', error);
      return null;
    }
  }

  /**
   * 执行密码重置
   * @param {string} token 重置令牌
   * @param {string} newPassword 新密码
   * @param {Object} options 选项
   * @returns {Promise<boolean>}
   */
  async resetPassword(token, newPassword, options = {}) {
    const { clientIP = null, userAgent = null } = options;

    try {
      // 1. 验证令牌
      const tokenData = await this.verifyResetToken(token);
      if (!tokenData) {
        throw new Error('重置令牌无效或已过期');
      }

      // 2. 验证新密码
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // 3. 检查新密码是否与当前密码相同
      const user = await User.findById(tokenData.user.id);
      if (user.password_hash) {
        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (isSamePassword) {
          throw new Error('新密码不能与当前密码相同');
        }
      }

      // 4. 更新密码
      const passwordHash = await bcrypt.hash(newPassword, 12); // 使用更高的安全等级
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 更新用户密码
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, tokenData.user.id]
        );

        // 标记令牌为已使用
        await client.query(
          'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW(), used_ip = $1, used_user_agent = $2 WHERE id = $3',
          [clientIP, userAgent, tokenData.tokenInfo.id]
        );

        // 记录密码重置成功事件
        await this._logPasswordReset(tokenData.user.id, clientIP, userAgent);

        // 吊销所有现有的refresh token（强制重新登录）
        await client.query(
          'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
          [tokenData.user.id]
        );

        await client.query('COMMIT');

        console.log(`[PasswordReset] 用户 ${tokenData.user.id} 密码重置成功`);
        return true;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('[PasswordReset] 密码重置失败:', error);
      throw new Error(error.message || '密码重置失败');
    }
  }

  /**
   * 获取用户的重置历史
   * @param {string} userId 用户ID
   * @param {number} limit 限制数量
   * @returns {Promise<Array>}
   */
  async getResetHistory(userId, limit = 10) {
    try {
      const { rows } = await pool.query(
        `SELECT created_at, expires_at, used, used_at, request_ip, used_ip
         FROM password_reset_tokens
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return rows.map(row => ({
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        used: row.used,
        usedAt: row.used_at,
        requestIP: row.request_ip,
        usedIP: row.used_ip
      }));

    } catch (error) {
      console.error('[PasswordReset] 获取重置历史失败:', error);
      return [];
    }
  }

  /**
   * 清理过期的重置令牌
   * @returns {Promise<number>}
   */
  async cleanupExpiredTokens() {
    try {
      const result = await pool.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR (used = TRUE AND used_at < NOW() - INTERVAL \'7 days\')'
      );

      const cleanedCount = result.rowCount;
      if (cleanedCount > 0) {
        console.log(`[PasswordReset] 清理了 ${cleanedCount} 个过期的重置令牌`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('[PasswordReset] 清理过期令牌失败:', error);
      return 0;
    }
  }

  /**
   * 检查速率限制
   * @param {string} userId 用户ID
   * @param {string} clientIP 客户端IP
   * @returns {Promise<Object>}
   * @private
   */
  async _checkRateLimit(userId, clientIP) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // 检查用户请求频率
      const { rows: userRequests } = await pool.query(
        'SELECT COUNT(*) as count, MAX(created_at) as latest FROM password_reset_tokens WHERE user_id = $1 AND created_at > $2',
        [userId, oneHourAgo]
      );

      const userRequestCount = parseInt(userRequests[0].count);
      
      if (userRequestCount >= this.MAX_REQUESTS_PER_HOUR) {
        const latestRequest = new Date(userRequests[0].latest);
        const waitTime = 60 - Math.floor((Date.now() - latestRequest.getTime()) / (60 * 1000));
        
        return {
          allowed: false,
          reason: 'USER_RATE_LIMIT',
          waitMinutes: Math.max(waitTime, 1)
        };
      }

      // 检查IP请求频率（如果提供了IP）
      if (clientIP) {
        const { rows: ipRequests } = await pool.query(
          'SELECT COUNT(*) as count FROM password_reset_tokens WHERE request_ip = $1 AND created_at > $2',
          [clientIP, oneHourAgo]
        );

        const ipRequestCount = parseInt(ipRequests[0].count);
        
        if (ipRequestCount >= this.MAX_REQUESTS_PER_HOUR * 2) { // IP限制更宽松
          return {
            allowed: false,
            reason: 'IP_RATE_LIMIT',
            waitMinutes: 30
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      console.error('[PasswordReset] 速率限制检查失败:', error);
      return { allowed: true }; // 出错时允许请求，避免阻断正常用户
    }
  }

  /**
   * 生成安全令牌
   * @returns {string}
   * @private
   */
  _generateSecureToken() {
    // 使用双重UUID确保足够的随机性和长度
    return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
  }

  /**
   * 存储重置令牌
   * @param {string} userId 用户ID
   * @param {string} token 令牌
   * @param {Date} expiresAt 过期时间
   * @param {string} clientIP 客户端IP
   * @returns {Promise<void>}
   * @private
   */
  async _storeToken(userId, token, expiresAt, clientIP) {
    // 先使旧的未使用令牌失效
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [userId]
    );

    // 插入新令牌
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, request_ip, verification_count) 
       VALUES ($1, $2, $3, $4, 0)`,
      [userId, token, expiresAt, clientIP]
    );
  }

  /**
   * 使令牌失效
   * @param {string} tokenId 令牌ID
   * @returns {Promise<void>}
   * @private
   */
  async _invalidateToken(tokenId) {
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [tokenId]
    );
  }

  /**
   * 记录重置请求
   * @param {string} userId 用户ID
   * @param {string} token 令牌
   * @param {string} clientIP 客户端IP
   * @param {boolean} emailSent 邮件是否发送成功
   * @returns {Promise<void>}
   * @private
   */
  async _logResetRequest(userId, token, clientIP, emailSent) {
    try {
      console.log(`[PasswordReset] 重置请求记录: 用户=${userId}, IP=${clientIP}, 邮件发送=${emailSent}`);
    } catch (error) {
      console.error('[PasswordReset] 记录重置请求失败:', error);
    }
  }

  /**
   * 记录密码重置成功事件
   * @param {string} userId 用户ID
   * @param {string} clientIP 客户端IP
   * @param {string} userAgent 用户代理
   * @returns {Promise<void>}
   * @private
   */
  async _logPasswordReset(userId, clientIP, userAgent) {
    try {
      console.log(`[PasswordReset] 密码重置成功: 用户=${userId}, IP=${clientIP}`);
    } catch (error) {
      console.error('[PasswordReset] 记录密码重置失败:', error);
    }
  }
}