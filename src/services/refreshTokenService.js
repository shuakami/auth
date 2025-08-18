import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index.js';
import { signRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import { encrypt, decrypt } from '../auth/cryptoUtils.js';

const REFRESH_TOKEN_MAX_LIFETIME = 90 * 24 * 60 * 60 * 1000; // 90天，单位ms

/**
 * 生成并存储新的 Refresh Token（加密存储）
 * @param {string} userId 用户ID
 * @param {string} deviceInfo 设备指纹/UA等
 * @param {string|null} parentId 父Token ID（轮换链）
 * @param {number} expiresIn 过期秒数，默认15天
 * @returns {Promise<{token: string, id: string, expiresAt: Date}>}
 */
export async function createRefreshToken(userId, deviceInfo, parentId = null, expiresIn = 60 * 60 * 24 * 15) {
  const id = uuidv4();
  const now = Date.now();
  const expiresAt = new Date(now + expiresIn * 1000);
  const createdAt = new Date(now);
  // 生成JWT，payload包含token唯一ID、用户ID、设备信息
  const token = signRefreshToken({ jti: id, uid: userId, device: deviceInfo });
  const encryptedToken = encrypt(token);
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token, device_info, parent_id, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, encryptedToken, deviceInfo, parentId, expiresAt, createdAt]
  );
  return { token, id, expiresAt };
}

/**
 * 校验Refresh Token有效性（数据库+JWT双重+最大生存期）
 * @param {string} token
 * @returns {Promise<{valid: boolean, reason?: string, dbToken?: any, payload?: any}>}
 */
export async function validateRefreshToken(token) {
  const payload = verifyRefreshToken(token);
  if (!payload || !payload.jti || !payload.uid) {
    return { valid: false, reason: '无效的Token', payload };
  }
  const { rows } = await pool.query(`SELECT * FROM refresh_tokens WHERE id = $1`, [payload.jti]);
  const dbToken = rows[0];
  if (!dbToken) return { valid: false, reason: 'Token不存在', payload };
  if (dbToken.revoked) return { valid: false, reason: 'Token已吊销', dbToken, payload };
  if (new Date(dbToken.expires_at) < new Date()) return { valid: false, reason: 'Token已过期', dbToken, payload };
  // 解密比对
  let decrypted;
  try {
    decrypted = decrypt(dbToken.token);
  } catch {
    return { valid: false, reason: 'Token解密失败', dbToken, payload };
  }
  if (decrypted !== token) return { valid: false, reason: 'Token不匹配', dbToken, payload };
  // 最大生存期限制
  const createdAt = dbToken.created_at ? new Date(dbToken.created_at) : null;
  if (createdAt && Date.now() - createdAt.getTime() > REFRESH_TOKEN_MAX_LIFETIME) {
    return { valid: false, reason: 'Token超出最大生存期', dbToken, payload };
  }
  return { valid: true, dbToken, payload };
}

/**
 * 轮换Refresh Token（Token Rotation）
 * @param {string} oldToken 旧Refresh Token串
 * @param {string} deviceInfo 当前设备指纹
 * @returns {Promise<{newToken: string, newId: string, expiresAt: Date}>}
 */
export async function rotateRefreshToken(oldToken, deviceInfo) {
  // 校验旧Token
  const { valid, dbToken, payload } = await validateRefreshToken(oldToken);
  if (!valid) throw new Error('旧Refresh Token无效或已失效');
  // 立即吊销旧Token
  await revokeRefreshTokenById(dbToken.id, '轮换');
  // 生成新Token，parentId为旧Token
  return await createRefreshToken(dbToken.user_id, deviceInfo, dbToken.id);
}

/**
 * 吊销指定Refresh Token（可用于登出、检测到盗用等）
 * @param {string} id Token主键ID
 * @param {string} reason 吊销原因
 */
export async function revokeRefreshTokenById(id, reason = '') {
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [id]);
}

/**
 * 检测Refresh Token被盗用（同一旧Token被多次使用）
 * @param {string} parentId 父Token ID
 * @returns {Promise<boolean>} 是否检测到盗用
 */
export async function detectTokenReuse(parentId) {
  // 查询同一parentId下是否有多个有效Token（即旧Token被多次轮换）
  const { rows } = await pool.query(
    `SELECT * FROM refresh_tokens WHERE parent_id = $1 AND revoked = FALSE`,
    [parentId]
  );
  return rows.length > 1;
}

/**
 * 吊销某用户所有Refresh Token（如强制下线）
 * @param {string} userId
 */
export async function revokeAllRefreshTokensForUser(userId) {
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);
}

/**
 * 获取用户所有活跃会话（未吊销且未过期）
 * @param {string} userId
 * @returns {Promise<Array>} 会话数组
 */
export async function getActiveSessionsForUser(userId) {
  const now = new Date();
  const { rows } = await pool.query(
    `SELECT id, device_info, created_at, last_used_at, expires_at, revoked
     FROM refresh_tokens
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > $2
     ORDER BY created_at DESC`,
    [userId, now]
  );
  return rows;
}

/**
 * 获取用户所有活跃会话及其聚合登录历史
 * @param {string} userId
 * @returns {Promise<Array>} 设备+历史复合信息
 */
export async function getSessionAggregatedInfoForUser(userId) {
  const now = new Date();
  // 1. 获取所有活跃会话
  const { rows: sessions } = await pool.query(
    `SELECT id, device_info, created_at, last_used_at, expires_at, revoked
     FROM refresh_tokens
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > $2
     ORDER BY created_at DESC`,
    [userId, now]
  );
  // 2. 对每个会话聚合登录历史
  const result = [];
  for (const session of sessions) {
    // 以 device_info 作为设备标识
    const { rows: history } = await pool.query(
      `SELECT login_at, ip_enc, fingerprint_enc, user_agent, location
       FROM login_history
       WHERE user_id = $1 AND success = TRUE AND user_agent = $2
       ORDER BY login_at DESC`,
      [userId, session.device_info]
    );
    let firstLoginAt = null, lastLoginAt = null, lastLocation = null, lastIp = null, lastUserAgent = null;
    if (history.length > 0) {
      lastLoginAt = history[0].login_at;
      // 解析JSON字符串格式的location数据
      try {
        lastLocation = history[0].location ? JSON.parse(history[0].location) : null;
      } catch (e) {
        console.warn('Failed to parse location JSON:', history[0].location);
        lastLocation = null;
      }
      lastIp = history[0].ip_enc ? decrypt(history[0].ip_enc) : null;
      lastUserAgent = history[0].user_agent;
      firstLoginAt = history[history.length - 1].login_at;
    }
    result.push({
      ...session,
      firstLoginAt,
      lastLoginAt,
      lastLocation,
      lastIp,
      lastUserAgent
    });
  }
  return result;
} 