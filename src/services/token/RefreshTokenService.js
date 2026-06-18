/**
 * Refresh Token核心服务 - 处理token的生成、验证、轮换等核心操作
 */

import { randomUUID, timingSafeEqual } from 'crypto';
import { smartConnect } from '../../db/index.js';
import { signRefreshToken, verifyRefreshToken } from '../../auth/jwt.js';
import { encrypt, decrypt } from '../../auth/cryptoUtils.js';
import { buildRefreshTokenPayload } from '../../auth/services/oauth/refreshPolicy.js';

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
  REVOKE_BY_LINEAGE: 'rt_revoke_by_lineage_v1',
  ROTATE_REVOKE_OLD: 'rt_rotate_revoke_old_v1',
  ROTATE_INSERT_NEW: 'rt_rotate_insert_new_v1',
};

// 统一时间获取
const nowTs = () => Date.now();

// 轮换宽限窗口：刚轮换过的 Refresh Token 在该窗口内被并发/重试请求再次提交时，
// 返回已生成的替代 Token（幂等），而不是判定为重放并强制下线。
// 参考 OAuth 2.0 Security BCP，对刷新令牌轮换的并发场景给予短暂容错。
const ROTATION_GRACE_MS = 60 * 1000;

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
    expiresIn = this.DEFAULT_EXPIRES_IN,
    scope = null
  ) {
    const tokenData = this._generateTokenData(userId, deviceInfo, expiresIn, scope);

    try {
      await this._storeToken(tokenData, parentId, clientId);

      log(
        'info',
        `[RefreshToken] 已签发 Refresh Token: id=${tokenData.id} user=${userId} client=${clientId || 'cookie-session'} parent=${parentId || 'none'} scope=${scope || 'none'} expiresAt=${tokenData.expiresAt.toISOString()}`
      );

      return {
        token: tokenData.token,
        id: tokenData.id,
        expiresAt: tokenData.expiresAt,
        scope,
      };
    } catch (error) {
      log('error', `[RefreshToken] Token创建失败 user=${userId} client=${clientId || 'cookie-session'}:`, error);
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
    log(
      'debug',
      `[RefreshToken] 轮换请求: valid=${validation.valid} id=${validation.dbToken?.id || 'n/a'} revoked=${validation.dbToken?.revoked ?? 'n/a'} reason=${validation.reason || 'none'}`
    );
    if (!validation.valid) {
      // 令牌已被吊销：这通常是同一刷新令牌的并发/重试轮换。在宽限窗口内返回
      // 已生成的替代令牌（幂等），窗口外则视为重放并吊销整个家族。
      if (validation.dbToken && validation.dbToken.revoked) {
        const replacement = await this._findFreshReplacement(validation.dbToken.id);
        if (replacement) {
          return replacement;
        }
        // 真正的重放：只吊销受影响的这一条令牌链（lineage），而不是该用户的全部会话。
        // 按 user_id 连坐吊销会让任何一次良性的「轮换响应丢失后用旧令牌重试」拖垮用户在所有
        // 客户端/设备上的会话。这里沿现有的 parent_id 链递归定位本条会话链（参见 OAuth 2.0
        // Security BCP：刷新令牌重用应吊销令牌家族）。
        log(
          'warn',
          `[RefreshToken] 检测到已吊销Token在宽限期外被重放，吊销本令牌链: ${validation.dbToken.id}`
        );
        await this.revokeTokenLineage(validation.dbToken.id);
        throw new Error('invalid_grant: 检测到Refresh Token重放，请重新登录');
      }
      throw new Error(`invalid_grant: ${validation.reason || '刷新令牌无效'}`);
    }

    const client = await smartConnect();
    try {
      await client.query('BEGIN');

      // 生成新Token数据。轮换必须保留原令牌的授权范围(scope)，否则续期后
      // 下发的 access token 会丢失 scope，导致受 scope 保护的资源(如 OIDC 敏感接口)
      // 在续期后返回 insufficient_scope，表现为「续期了会断」。
      const preservedScope = validation.dbToken.scope || validation.payload?.scope || null;
      const tokenData = this._generateTokenData(
        validation.dbToken.user_id,
        deviceInfo,
        this.DEFAULT_EXPIRES_IN,
        preservedScope
      );

      // 1) 吊销旧Token。条件更新会持有行锁，并发的另一个轮换在本事务提交后
      //    重新评估 WHERE 时将匹配到 0 行，从而避免为同一父令牌写入多个子令牌。
      const revokeResult = await client.query({
        name: PSN.ROTATE_REVOKE_OLD,
        text: 'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1 AND revoked = FALSE',
        values: [validation.dbToken.id],
      });

      // 未吊销任何行 => 另一个并发请求已经轮换过该令牌。回滚并返回它生成的替代令牌，
      // 保证并发刷新得到一致且有效的结果，而不是各自写入孤儿令牌。
      if (revokeResult.rowCount === 0) {
        await client.query('ROLLBACK');
        const replacement = await this._findFreshReplacement(validation.dbToken.id);
        if (replacement) {
          return replacement;
        }
        throw new Error('invalid_grant: Token已吊销');
      }

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
        `[RefreshToken] Token轮换成功 (事务): ${validation.dbToken.id} -> ${tokenData.id} user=${validation.dbToken.user_id} client=${validation.dbToken.client_id || 'cookie-session'} scope=${preservedScope || 'none'}`
      );

      return {
        token: tokenData.token,
        id: tokenData.id,
        expiresAt: tokenData.expiresAt,
        scope: preservedScope,
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // 事务可能已结束，忽略回滚错误
      }
      // 保留安全决策类错误（如重放/已吊销），以便上层映射为 invalid_grant。
      if (error instanceof Error && error.message.startsWith('invalid_grant:')) {
        throw error;
      }
      log('error', '[RefreshToken] Token轮换失败 (事务回滚):', error);
      throw new Error('Token轮换失败');
    } finally {
      client.release();
    }
  }

  /**
   * 查找某个父令牌在宽限窗口内、未吊销且未过期的替代子令牌，并解密返回。
   * 用于刷新令牌轮换的并发/重试幂等处理。
   * @param {string} parentId 已被轮换（吊销）的父令牌ID
   * @param {number} graceMs 宽限窗口（毫秒）
   * @returns {Promise<{token: string, id: string, expiresAt: Date|string}|null>}
   * @private
   */
  async _findFreshReplacement(parentId, graceMs = ROTATION_GRACE_MS) {
    const client = await smartConnect();
    try {
      const { rows } = await client.query({
        text: `
          SELECT id, token, expires_at, created_at, scope
          FROM refresh_tokens
          WHERE parent_id = $1 AND revoked = FALSE
          ORDER BY created_at DESC
          LIMIT 1
        `,
        values: [parentId],
      });

      const child = rows[0];
      if (!child) {
        return null;
      }

      const createdMs =
        child.created_at instanceof Date
          ? child.created_at.getTime()
          : new Date(child.created_at).getTime();
      if (!Number.isFinite(createdMs) || nowTs() - createdMs > graceMs) {
        return null;
      }

      const expMs =
        child.expires_at instanceof Date
          ? child.expires_at.getTime()
          : new Date(child.expires_at).getTime();
      if (!Number.isFinite(expMs) || expMs <= nowTs()) {
        return null;
      }

      let token;
      try {
        token = decrypt(child.token);
      } catch (error) {
        log('error', '[RefreshToken] 替代Token解密失败:', error);
        return null;
      }
      if (!token) {
        return null;
      }

      return { token, id: child.id, expiresAt: child.expires_at, scope: child.scope || null };
    } catch (error) {
      log('error', '[RefreshToken] 查找替代Token失败:', error);
      return null;
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
   * 吊销一条令牌家族（lineage）下的全部未吊销令牌。
   *
   * 仅依赖现有的 parent_id 列：从传入的令牌沿 parent_id 向上爬到可达的最顶端祖先，
   * 再向下展开该祖先的所有后代，只吊销这一条轮换链。用于刷新令牌重放检测，
   * 只下线受影响的这一个会话，不波及该用户的其它会话/设备。
   * @param {string} tokenId 该令牌链上任一令牌的ID
   * @returns {Promise<void>}
   */
  async revokeTokenLineage(tokenId) {
    if (!tokenId) return;
    const client = await smartConnect();
    try {
      const res = await client.query({
        name: PSN.REVOKE_BY_LINEAGE,
        text: `
          WITH RECURSIVE up AS (
            SELECT id, parent_id, 0 AS depth
            FROM refresh_tokens
            WHERE id = $1
            UNION ALL
            SELECT t.id, t.parent_id, up.depth + 1
            FROM refresh_tokens t
            JOIN up ON t.id = up.parent_id
          ),
          top AS (
            SELECT id FROM up ORDER BY depth DESC LIMIT 1
          ),
          family AS (
            SELECT id FROM top
            UNION
            SELECT t.id
            FROM refresh_tokens t
            JOIN family f ON t.parent_id = f.id
          )
          UPDATE refresh_tokens
          SET revoked = TRUE
          WHERE id IN (SELECT id FROM family) AND revoked = FALSE
        `,
        values: [tokenId],
      });
      log('warn', `[RefreshToken] 令牌链 ${tokenId} 已吊销，共${res.rowCount}个`);
    } catch (error) {
      log('error', '[RefreshToken] 吊销令牌链失败:', error);
      // 兑底：退而吊销这一个令牌本身，避免重放检测因查询异常而完全不生效。
      try {
        await client.query({
          name: PSN.REVOKE_BY_ID,
          text: 'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1 AND revoked = FALSE',
          values: [tokenId],
        });
      } catch (fallbackError) {
        log('error', '[RefreshToken] 吊销单个令牌兑底也失败:', fallbackError);
      }
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
  _generateTokenData(userId, deviceInfo, expiresIn, scope = null) {
    const id = randomUUID();
    const now = nowTs();
    const expiresAt = new Date(now + expiresIn * 1000);
    const createdAt = new Date(now);

    // 将 scope 同时写入 JWT 载荷，使其随令牌轮换自然流转，并在 DB 列缺失时仍可恢复。
    const payload = buildRefreshTokenPayload({ id, userId, deviceInfo, scope });

    const token = signRefreshToken(payload);

    const encryptedToken = encrypt(token);

    return {
      id,
      token,
      encryptedToken,
      userId,
      deviceInfo,
      expiresAt,
      createdAt,
      scope: scope || null,
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
            (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id, scope)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)
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
          tokenData.scope,
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
          SELECT id, user_id, token, revoked, expires_at, created_at, client_id, scope
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
