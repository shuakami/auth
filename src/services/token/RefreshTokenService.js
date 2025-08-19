/**
 * Refresh Token核心服务 - 处理token的生成、验证、轮换等核心操作
 */
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../db/index.js';
import { signRefreshToken, verifyRefreshToken } from '../../auth/jwt.js';
import { encrypt, decrypt } from '../../auth/cryptoUtils.js';

export class RefreshTokenService {
  constructor() {
    this.MAX_LIFETIME = 90 * 24 * 60 * 60 * 1000; // 90天
    this.DEFAULT_EXPIRES_IN = 60 * 60 * 24 * 15; // 15天
  }

  /**
   * 生成并存储新的 Refresh Token
   * @param {string} userId 用户ID
   * @param {string} deviceInfo 设备信息
   * @param {string|null} parentId 父Token ID
   * @param {number} expiresIn 过期秒数
   * @returns {Promise<Object>}
   */
  async createToken(userId, deviceInfo, parentId = null, expiresIn = this.DEFAULT_EXPIRES_IN) {
    const tokenData = this._generateTokenData(userId, deviceInfo, expiresIn);
    
    try {
      await this._storeToken(tokenData, parentId);
      
      return {
        token: tokenData.token,
        id: tokenData.id,
        expiresAt: tokenData.expiresAt
      };
    } catch (error) {
      console.error('[RefreshToken] Token创建失败:', error);
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
      // 1. JWT验证
      const payload = verifyRefreshToken(token);
      if (!this._isValidPayload(payload)) {
        return { valid: false, reason: '无效的Token格式', payload };
      }

      // 2. 数据库验证
      const dbToken = await this._getTokenFromDB(payload.jti);
      if (!dbToken) {
        return { valid: false, reason: 'Token不存在', payload };
      }

      // 3. 状态检查
      const statusCheck = this._checkTokenStatus(dbToken);
      if (!statusCheck.valid) {
        return { ...statusCheck, dbToken, payload };
      }

      // 4. 内容验证
      const contentCheck = await this._verifyTokenContent(token, dbToken);
      if (!contentCheck.valid) {
        return { ...contentCheck, dbToken, payload };
      }

      // 5. 生存期检查
      const lifetimeCheck = this._checkTokenLifetime(dbToken);
      if (!lifetimeCheck.valid) {
        return { ...lifetimeCheck, dbToken, payload };
      }

      return { valid: true, dbToken, payload };

    } catch (error) {
      console.error('[RefreshToken] Token验证失败:', error);
      return { valid: false, reason: 'Token验证异常' };
    }
  }

  /**
   * 轮换 Refresh Token
   * @param {string} oldToken 旧Token
   * @param {string} deviceInfo 设备信息
   * @returns {Promise<Object>}
   */
  async rotateToken(oldToken, deviceInfo) {
    const validation = await this.validateToken(oldToken);
    
    if (!validation.valid) {
      throw new Error(`Token轮换失败: ${validation.reason}`);
    }

    try {
      // 立即吊销旧Token
      await this.revokeToken(validation.dbToken.id, '轮换');
      
      // 生成新Token
      const newToken = await this.createToken(
        validation.dbToken.user_id,
        deviceInfo,
        validation.dbToken.id
      );

      console.log(`[RefreshToken] Token轮换成功: ${validation.dbToken.id} -> ${newToken.id}`);
      return newToken;

    } catch (error) {
      console.error('[RefreshToken] Token轮换失败:', error);
      throw new Error('Token轮换失败');
    }
  }

  /**
   * 吊销指定Token
   * @param {string} tokenId Token ID
   * @param {string} reason 吊销原因
   * @returns {Promise<void>}
   */
  async revokeToken(tokenId, reason = '') {
    try {
      await pool.query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1',
        [tokenId]
      );
      
      console.log(`[RefreshToken] Token已吊销: ${tokenId}, 原因: ${reason}`);
    } catch (error) {
      console.error('[RefreshToken] Token吊销失败:', error);
      throw new Error('Token吊销失败');
    }
  }

  /**
   * 吊销用户所有Token
   * @param {string} userId 用户ID
   * @returns {Promise<void>}
   */
  async revokeAllUserTokens(userId) {
    try {
      const result = await pool.query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
        [userId]
      );
      
      console.log(`[RefreshToken] 用户${userId}的所有Token已吊销，共${result.rowCount}个`);
    } catch (error) {
      console.error('[RefreshToken] 批量吊销Token失败:', error);
      throw new Error('批量吊销Token失败');
    }
  }

  /**
   * 生成Token数据
   * @param {string} userId 
   * @param {string} deviceInfo 
   * @param {number} expiresIn 
   * @returns {Object}
   * @private
   */
  _generateTokenData(userId, deviceInfo, expiresIn) {
    const id = uuidv4();
    const now = Date.now();
    const expiresAt = new Date(now + expiresIn * 1000);
    const createdAt = new Date(now);
    
    const token = signRefreshToken({
      jti: id,
      uid: userId,
      device: deviceInfo
    });
    
    const encryptedToken = encrypt(token);

    return {
      id,
      token,
      encryptedToken,
      userId,
      deviceInfo,
      expiresAt,
      createdAt
    };
  }

  /**
   * 存储Token到数据库
   * @param {Object} tokenData 
   * @param {string|null} parentId 
   * @returns {Promise<void>}
   * @private
   */
  async _storeToken(tokenData, parentId) {
    await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token, device_info, parent_id, expires_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tokenData.id,
        tokenData.userId,
        tokenData.encryptedToken,
        tokenData.deviceInfo,
        parentId,
        tokenData.expiresAt,
        tokenData.createdAt
      ]
    );
  }

  /**
   * 验证JWT载荷有效性
   * @param {Object} payload 
   * @returns {boolean}
   * @private
   */
  _isValidPayload(payload) {
    return payload && payload.jti && payload.uid;
  }

  /**
   * 从数据库获取Token
   * @param {string} tokenId 
   * @returns {Promise<Object|null>}
   * @private
   */
  async _getTokenFromDB(tokenId) {
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE id = $1',
      [tokenId]
    );
    return rows[0] || null;
  }

  /**
   * 检查Token状态
   * @param {Object} dbToken 
   * @returns {Object}
   * @private
   */
  _checkTokenStatus(dbToken) {
    if (dbToken.revoked) {
      return { valid: false, reason: 'Token已吊销' };
    }
    
    if (new Date(dbToken.expires_at) < new Date()) {
      return { valid: false, reason: 'Token已过期' };
    }
    
    return { valid: true };
  }

  /**
   * 验证Token内容
   * @param {string} token 
   * @param {Object} dbToken 
   * @returns {Promise<Object>}
   * @private
   */
  async _verifyTokenContent(token, dbToken) {
    try {
      const decrypted = decrypt(dbToken.token);
      if (decrypted !== token) {
        return { valid: false, reason: 'Token内容不匹配' };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Token解密失败' };
    }
  }

  /**
   * 检查Token生存期
   * @param {Object} dbToken 
   * @returns {Object}
   * @private
   */
  _checkTokenLifetime(dbToken) {
    if (!dbToken.created_at) {
      return { valid: true }; // 容错处理
    }
    
    const createdAt = new Date(dbToken.created_at);
    const lifetime = Date.now() - createdAt.getTime();
    
    if (lifetime > this.MAX_LIFETIME) {
      return { valid: false, reason: 'Token超出最大生存期' };
    }
    
    return { valid: true };
  }
}