/**
 * 备份码服务 - 安全增强版
 * 提供2FA备份码的生成、验证和管理功能
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { smartQuery, smartConnect } from '../../db/index.js';
import crypto from 'crypto';

export class BackupCodeService {
  constructor() {
    this.DEFAULT_CODE_COUNT = 10;
    this.CODE_LENGTH = 8;
    this.MAX_VERIFICATION_ATTEMPTS = 5; // 防止暴力破解
    this.CODE_EXPIRY_DAYS = 365; // 备份码1年有效期
  }

  /**
   * 生成并保存用户的备份码
   * @param {string} userId 用户ID
   * @param {Object} options 生成选项
   * @returns {Promise<Object>}
   */
  async generateAndSaveBackupCodes(userId, options = {}) {
    const { 
      count = this.DEFAULT_CODE_COUNT,
      regenerate = true // 是否重新生成（删除旧的）
    } = options;

    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      if (count < 5 || count > 20) {
        throw new Error('备份码数量必须在5-20之间');
      }

      // 生成新的备份码
      const codes = this._generateSecureBackupCodes(count);

      const client = await smartConnect();
      try {
        await client.query('BEGIN');

        // 如果需要重新生成，删除现有的备份码
        if (regenerate) {
          const { rows: oldCodes } = await client.query(
            'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = $1',
            [userId]
          );
          
          if (parseInt(oldCodes[0].count) > 0) {
            await client.query(
              'DELETE FROM backup_codes WHERE user_id = $1',
              [userId]
            );
            console.log(`[BackupCode] 用户 ${userId} 的 ${oldCodes[0].count} 个旧备份码已删除`);
          }
        }

        // 存储新的备份码（使用现有的数据库结构）
        const codeRecords = [];
        for (const code of codes) {
          const id = uuidv4();
          const hash = await bcrypt.hash(code, 12); // 使用更高的安全等级
          
          await client.query(
            'INSERT INTO backup_codes (id, user_id, code_hash) VALUES ($1, $2, $3)',
            [id, userId, hash]
          );

          codeRecords.push({ id, code });
        }

        // 记录生成事件
        await this._logBackupCodeEvent(client, userId, 'GENERATED', {
          count: codes.length,
          regenerate
        });

        await client.query('COMMIT');

        console.log(`[BackupCode] 用户 ${userId} 成功生成 ${codes.length} 个备份码`);

        return {
          codes, // 明文备份码，仅在生成时返回
          count: codes.length,
          message: '请安全保存这些备份码，它们只会显示一次'
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('[BackupCode] 生成备份码失败:', error);
      throw new Error(error.message || '生成备份码失败');
    }
  }

  /**
   * 验证备份码
   * @param {string} userId 用户ID
   * @param {string} code 用户输入的备份码
   * @param {Object} options 验证选项
   * @returns {Promise<Object>}
   */
  async verifyBackupCode(userId, code, options = {}) {
    const { clientIP = null, userAgent = null } = options;

    try {
      if (!userId || !code) {
        throw new Error('用户ID和备份码是必填字段');
      }

      // 规范化输入的备份码
      const normalizedCode = code.replace(/\s/g, '').toUpperCase();

      if (normalizedCode.length !== this.CODE_LENGTH) {
        throw new Error('备份码格式无效');
      }

      const client = await smartConnect();
      try {
        await client.query('BEGIN');

        // 获取用户所有可用的备份码（使用现有数据库结构）
        const { rows: availableCodes } = await client.query(
          'SELECT id, code_hash FROM backup_codes WHERE user_id = $1 AND used = FALSE',
          [userId]
        );

        if (availableCodes.length === 0) {
          await client.query('ROLLBACK');
          throw new Error('没有可用的备份码，请联系管理员或重新生成');
        }

        // 遍历所有未使用的备份码，尝试匹配
        let matchedCode = null;
        for (const codeRecord of availableCodes) {
          const isMatch = await bcrypt.compare(normalizedCode, codeRecord.code_hash);
          if (isMatch) {
            matchedCode = codeRecord;
            break;
          }
        }

        if (!matchedCode) {
          // 记录验证失败事件
          await this._logBackupCodeEvent(client, userId, 'VERIFICATION_FAILED', {
            attemptedCode: normalizedCode.substring(0, 2) + '******',
            clientIP,
            userAgent
          });

          await client.query('COMMIT');
          throw new Error('备份码无效');
        }

        // 标记备份码为已使用
        await client.query(
          'UPDATE backup_codes SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = $1',
          [matchedCode.id]
        );

        // 获取剩余备份码数量
        const { rows: remainingCodes } = await client.query(
          'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = $1 AND used = FALSE',
          [userId]
        );

        const remainingCount = parseInt(remainingCodes[0].count);

        // 记录验证成功事件
        await this._logBackupCodeEvent(client, userId, 'VERIFICATION_SUCCESS', {
          codeId: matchedCode.id,
          remainingCount,
          clientIP,
          userAgent
        });

        await client.query('COMMIT');

        console.log(`[BackupCode] 用户 ${userId} 备份码验证成功，剩余 ${remainingCount} 个`);

        return {
          success: true,
          remainingCount,
          warningMessage: remainingCount <= 2 
            ? `警告：您只剩下 ${remainingCount} 个备份码，建议尽快重新生成` 
            : null
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('[BackupCode] 验证备份码失败:', error);
      throw new Error(error.message || '验证备份码失败');
    }
  }

  /**
   * 检查用户是否有可用的备份码
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async hasAvailableBackupCodes(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await smartQuery(
        'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = $1 AND used = FALSE',
        [userId]
      );

      return parseInt(rows[0].count) > 0;

    } catch (error) {
      console.error('[BackupCode] 检查可用备份码失败:', error);
      return false;
    }
  }

  /**
   * 获取用户剩余的备份码数量
   * @param {string} userId 用户ID
   * @returns {Promise<number>}
   */
  async getRemainingBackupCodesCount(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await smartQuery(
        'SELECT COUNT(*) as count FROM backup_codes WHERE user_id = $1 AND used = FALSE',
        [userId]
      );

      return parseInt(rows[0].count);

    } catch (error) {
      console.error('[BackupCode] 获取剩余备份码数量失败:', error);
      return 0;
    }
  }

  /**
   * 获取备份码统计信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getBackupCodeStats(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await smartQuery(
        `SELECT 
           COUNT(*) as total_generated,
           COUNT(CASE WHEN used = FALSE THEN 1 END) as available,
           COUNT(CASE WHEN used = TRUE THEN 1 END) as used
         FROM backup_codes 
         WHERE user_id = $1`,
        [userId]
      );

      const stats = rows[0];
      
      return {
        totalGenerated: parseInt(stats.total_generated) || 0,
        available: parseInt(stats.available) || 0,
        used: parseInt(stats.used) || 0,
        needsRegeneration: parseInt(stats.available) <= 2
      };

    } catch (error) {
      console.error('[BackupCode] 获取备份码统计失败:', error);
      throw new Error('获取备份码统计失败');
    }
  }

  /**
   * 获取备份码使用历史
   * @param {string} userId 用户ID
   * @param {number} limit 限制数量
   * @returns {Promise<Array>}
   */
  async getBackupCodeHistory(userId, limit = 20) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      // 查询现有数据库结构中的字段
      const { rows } = await smartQuery(
        'SELECT id, used, used_at FROM backup_codes WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
        [userId, limit]
      );

      return rows.map(row => ({
        id: row.id,
        used: row.used,
        usedAt: row.used_at,
        status: row.used ? 'USED' : 'AVAILABLE'
      }));

    } catch (error) {
      console.error('[BackupCode] 获取备份码历史失败:', error);
      throw new Error('获取备份码历史失败');
    }
  }

  /**
   * 清理过期的备份码
   * @param {Object} options 清理选项
   * @returns {Promise<number>}
   */
  async cleanupExpiredCodes(options = {}) {
    const { 
      batchSize = 1000,
      retentionDays = 365 // 保留1年的已使用备份码
    } = options;

    try {
      const cleanupDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // 清理很久以前使用的备份码（由于没有expires_at字段，基于used_at清理）
      const result = await smartQuery(
        `DELETE FROM backup_codes 
         WHERE used = TRUE 
         AND used_at < $1 
         AND id IN (
           SELECT id FROM backup_codes 
           WHERE used = TRUE AND used_at < $1 
           LIMIT $2
         )`,
        [cleanupDate, batchSize]
      );

      const cleanedCount = result.rowCount;
      
      if (cleanedCount > 0) {
        console.log(`[BackupCode] 清理了 ${cleanedCount} 个旧的已使用备份码`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('[BackupCode] 清理过期备份码失败:', error);
      return 0;
    }
  }

  /**
   * 生成安全的备份码
   * @param {number} count 生成数量
   * @returns {Array<string>}
   * @private
   */
  _generateSecureBackupCodes(count) {
    const codes = [];
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
    
    while (codes.length < count) {
      let code = '';
      
      // 生成8位随机代码
      for (let i = 0; i < this.CODE_LENGTH; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        code += charset[randomIndex];
      }
      
      // 确保代码唯一性（虽然概率极低）
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }
    
    return codes;
  }

  /**
   * 记录备份码事件
   * @param {Object} client 数据库客户端
   * @param {string} userId 用户ID
   * @param {string} eventType 事件类型
   * @param {Object} details 事件详情
   * @returns {Promise<void>}
   * @private
   */
  async _logBackupCodeEvent(client, userId, eventType, details) {
    try {
      // 这里可以记录到审计日志表，现在先用控制台日志
      console.log(`[BackupCode] 事件记录: 用户=${userId}, 事件=${eventType}, 详情=`, details);
      
      // 如果有审计日志表，可以这样记录：
      /*
      await client.query(
        'INSERT INTO audit_logs (user_id, event_type, details, created_at) VALUES ($1, $2, $3, NOW())',
        [userId, `BACKUP_CODE_${eventType}`, JSON.stringify(details)]
      );
      */
    } catch (error) {
      console.error('[BackupCode] 记录事件失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 验证备份码格式
   * @param {string} code 备份码
   * @returns {boolean}
   */
  isValidCodeFormat(code) {
    if (!code) return false;
    
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();
    
    // 检查长度
    if (normalizedCode.length !== this.CODE_LENGTH) {
      return false;
    }
    
    // 检查字符是否都在允许的字符集中
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return normalizedCode.split('').every(char => charset.includes(char));
  }

  /**
   * 格式化备份码（用于显示）
   * @param {string} code 备份码
   * @returns {string}
   */
  formatCodeForDisplay(code) {
    if (!code) return '';
    
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();
    
    // 每4位添加一个空格
    return normalizedCode.replace(/(.{4})/g, '$1 ').trim();
  }
}