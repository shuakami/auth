/**
 * Refresh Token核心服务 - 处理token的生成、验证、轮换等核心操作
 */

import { randomUUID, timingSafeEqual } from 'crypto';
import { smartConnect } from '../../db/index.js';
import { signRefreshToken, verifyRefreshToken } from '../../auth/jwt.js';
import { encrypt, decrypt } from '../../auth/cryptoUtils.js';

// 日志控制
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };
function log(level, ...args) {
  if ((LOG_ORDER[level] || 999) >= (LOG_ORDER[LOG_LEVEL] || 20)) {
    // eslint-disable-next-line no-console
    console[level](...args);
  }
}

// 命名预编译语句名称
const PSN = {
  INSERT_TOKEN: 'rt_insert_token_v1',
  SELECT_TOKEN_BY_ID: 'rt_select_token_by_id_v1',
  REVOKE_BY_ID: 'rt_revoke_by_id_v1',
  REVOKE_BY_USER: 'rt_revoke_by_user_v1',
  ROTATE_REVOKE_OLD: 'rt_rotate_revoke_old_v1',
  ROTATE_INSERT_NEW: 'rt_rotate_insert_new_v1',
};

// 统一时间获取
const nowTs = () => Date.now();

export class RefreshTokenService {
  constructor() {
    this.MAX_LIFETIME = 90 * 24 * 60 * 60 * 1000; // 90天 (ms)
    this.DEFAULT_EXPIRES_IN = 60 * 60 * 24 * 15; // 15天 (s)
  }

  /**
   * 生成并存储新的 Refresh Token
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息
   * @param {string|null} clientId 客户端ID
   * @param {string|null} parentId 父Token ID
   * @param {number} expiresIn 过期秒数
   * @returns {Promise<Object>}
   */
  async createToken(
    userId,
    deviceInfo,
    clientId = null,
    parentId = null,
    expiresIn = this.DEFAULT_EXPIRES_IN
  ) {
    const tokenData = this._generateTokenData(userId, deviceInfo, expiresIn);

    try {
      await this._storeToken(tokenData, parentId, clientId);

      return {
        token: tokenData.token,
        id: tokenData.id,
        expiresAt: tokenData.expiresAt,
      };
    } catch (error) {
      log('error', '[RefreshToken] Token创建失败:', error);
      throw new Error('Token创建失败');
    }
  }

  /**
   * 验证 Refresh Token 有效性
   * @param {string} token Token字符串
   * @returns {Promise<Object>}
   */
  async validateToken(token) {
    try {
      // 1) JWT验证（最便宜的失败路径）
      const payload = verifyRefreshToken(token);
      if (!this._isValidPayload(payload)) {
        return { valid: false, reason: '无效的Token格式', payload };
      }

      // 2) DB 验证（命名预编译 + 精简列）
      const dbToken = await this._getTokenFromDB(payload.jti);
      if (!dbToken) {
        return { valid: false, reason: 'Token不存在', payload };
      }

      // 3) 状态检查（时间戳比较，无对象分配）
      const statusCheck = this._checkTokenStatus(dbToken);
      if (!statusCheck.valid) {
        return { ...statusCheck, dbToken, payload };
      }

      // 4) 内容验证（常量时间比较，强一致）
      const contentCheck = await this._verifyTokenContent(token, dbToken);
      if (!contentCheck.valid) {
        return { ...contentCheck, dbToken, payload };
      }

      // 5) 生存期检查（最大寿命）
      const lifetimeCheck = this._checkTokenLifetime(dbToken);
      if (!lifetimeCheck.valid) {
        return { ...lifetimeCheck, dbToken, payload };
      }

      return { valid: true, dbToken, payload };
    } catch (error) {
      log('error', '[RefreshToken] Token验证失败:', error);
      return { valid: false, reason: 'Token验证异常' };
    }
  }

  /**
   * 轮换 Refresh Token (使用事务确保原子性)
   * @param {string} oldToken 旧Token
   * @param {string} deviceInfo 设备信息
   * @returns {Promise<Object>}
   */
  async rotateToken(oldToken, deviceInfo) {
    const validation = await this.validateToken(oldToken);
    if (!validation.valid) {
      throw new Error(`Token轮换失败: ${validation.reason}`);
    }

    const client = await smartConnect();
    try {
      await client.query('BEGIN');

      // 生成新Token数据
      const tokenData = this._generateTokenData(
        validation.dbToken.user_id,
        deviceInfo,
        this.DEFAULT_EXPIRES_IN
      );

      // 1) 吊销旧Token（若已吊销则不影响幂等性）
      await client.query({
        name: PSN.ROTATE_REVOKE_OLD,
        text: 'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1 AND revoked = FALSE',
        values: [validation.dbToken.id],
      });

      // 2) 写入新Token
      await client.query({
        name: PSN.ROTATE_INSERT_NEW,
        text: `
          INSERT INTO refresh_tokens
            (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
        `,
        values: [
          tokenData.id,
          tokenData.userId,
          tokenData.encryptedToken,
          tokenData.deviceInfo,
          validation.dbToken.id, // parentId
          tokenData.expiresAt,
          tokenData.createdAt,
          validation.dbToken.client_id, // 轮换时保留clientId
        ],
      });

      await client.query('COMMIT');

      log(
        'info',
        `[RefreshToken] Token轮换成功 (事务): ${validation.dbToken.id} -> ${tokenData.id}`
      );

      return {
        token: tokenData.token,
        id: tokenData.id,
        expiresAt: tokenData.expiresAt,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      log('error', '[RefreshToken] Token轮换失败 (事务回滚):', error);
      throw new Error('Token轮换失败');
    } finally {
      client.release();
    }
  }

  /**
   * 吊销指定Token
   * @param {string} tokenId Token ID
   * @param {string} reason 吊销原因
   * @returns {Promise<void>}
   */
  async revokeToken(tokenId, reason = '') {
    const client = await smartConnect();
    try {
      await client.query({
        name: PSN.REVOKE_BY_ID,
        text: 'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1 AND revoked = FALSE',
        values: [tokenId],
      });
      log('info', `[RefreshToken] Token已吊销: ${tokenId}, 原因: ${reason}`);
    } catch (error) {
      log('error', '[RefreshToken] Token吊销失败:', error);
      throw new Error('Token吊销失败');
    } finally {
      client.release();
    }
  }

  /**
   * 吊销用户所有Token
   * @param {string} userId 用户ID
   * @returns {Promise<void>}
   */
  async revokeAllUserTokens(userId) {
    const client = await smartConnect();
    try {
      const res = await client.query({
        name: PSN.REVOKE_BY_USER,
        text: 'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
        values: [userId],
      });
      log('warn', `[RefreshToken] 用户${userId}的所有Token已吊销，共${res.rowCount}个`);
    } catch (error) {
      log('error', '[RefreshToken] 批量吊销Token失败:', error);
      throw new Error('批量吊销Token失败');
    } finally {
      client.release();
    }
  }

  /**
   * 生成Token数据（使用原生 randomUUID + 时间戳）
   * @param {string} userId 
   * @param {string} deviceInfo 
   * @param {number} expiresIn 
   * @returns {Object}
   * @private
   */
  _generateTokenData(userId, deviceInfo, expiresIn) {
    const id = randomUUID();
    const now = nowTs();
    const expiresAt = new Date(now + expiresIn * 1000);
    const createdAt = new Date(now);

    const token = signRefreshToken({
      jti: id,
      uid: userId,
      device: deviceInfo,
    });

    const encryptedToken = encrypt(token);

    return {
      id,
      token,
      encryptedToken,
      userId,
      deviceInfo,
      expiresAt,
      createdAt,
    };
  }

  /**
   * 存储Token到数据库（命名预编译 + 显式连接）
   * @param {Object} tokenData 
   * @param {string|null} parentId 
   * @param {string|null} clientId
   * @returns {Promise<void>}
   * @private
   */
  async _storeToken(tokenData, parentId, clientId = null) {
    const client = await smartConnect();
    try {
      await client.query({
        name: PSN.INSERT_TOKEN,
        text: `
          INSERT INTO refresh_tokens
            (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
        `,
        values: [
          tokenData.id,
          tokenData.userId,
          tokenData.encryptedToken,
          tokenData.deviceInfo,
          parentId,
          tokenData.expiresAt,
          tokenData.createdAt,
          clientId,
        ],
      });
    } finally {
      client.release();
    }
  }

  /**
   * 验证JWT载荷有效性
   * @param {Object} payload 
   * @returns {boolean}
   * @private
   */
  _isValidPayload(payload) {
    return !!(payload && payload.jti && payload.uid);
  }

  /**
   * 从数据库获取Token（命名预编译 + 精简列）
   * @param {string} tokenId 
   * @returns {Promise<Object|null>}
   * @private
   */
  async _getTokenFromDB(tokenId) {
    const client = await smartConnect();
    try {
      const { rows } = await client.query({
        name: PSN.SELECT_TOKEN_BY_ID,
        text: `
          SELECT id, user_id, token, revoked, expires_at, created_at, client_id
          FROM refresh_tokens
          WHERE id = $1
          LIMIT 1
        `,
        values: [tokenId],
      });
      return rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * 检查Token状态（时间戳比较）
   * @param {Object} dbToken 
   * @returns {Object}
   * @private
   */
  _checkTokenStatus(dbToken) {
    if (dbToken.revoked) {
      return { valid: false, reason: 'Token已吊销' };
    }
    // 避免多次 new Date()，统一转时间戳比较
    const exp = dbToken.expires_at instanceof Date
      ? dbToken.expires_at.getTime()
      : new Date(dbToken.expires_at).getTime();

    if (exp <= nowTs()) {
      return { valid: false, reason: 'Token已过期' };
    }

    return { valid: true };
  }

  /**
   * 验证Token内容（常量时间比较）
   * @param {string} token 
   * @param {Object} dbToken 
   * @returns {Promise<Object>}
   * @private
   */
  async _verifyTokenContent(token, dbToken) {
    try {
      const decrypted = decrypt(dbToken.token);

      // 常量时间比较，避免时序侧信道
      const a = Buffer.from(decrypted, 'utf8');
      const b = Buffer.from(token, 'utf8');
      if (a.length !== b.length) {
        return { valid: false, reason: 'Token内容不匹配' };
      }
      const eq = timingSafeEqual(a, b);
      if (!eq) {
        return { valid: false, reason: 'Token内容不匹配' };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Token解密失败' };
    }
  }

  /**
   * 检查Token生存期（最大寿命）
   * @param {Object} dbToken 
   * @returns {Object}
   * @private
   */
  _checkTokenLifetime(dbToken) {
    if (!dbToken.created_at) {
      return { valid: true }; // 容错保持原逻辑
    }

    const createdMs =
      dbToken.created_at instanceof Date
        ? dbToken.created_at.getTime()
        : new Date(dbToken.created_at).getTime();

    const lifetime = nowTs() - createdMs;
    if (lifetime > this.MAX_LIFETIME) {
      return { valid: false, reason: 'Token超出最大生存期' };
    }

    return { valid: true };
  }
}
