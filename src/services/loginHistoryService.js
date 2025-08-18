import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index.js';
import { encrypt, decrypt } from '../auth/cryptoUtils.js';

/**
 * 记录一次登录历史
 * @param {Object} param
 * @param {string} param.userId 用户ID
 * @param {string} param.ip 明文IP
 * @param {string} param.fingerprint 浏览器指纹
 * @param {string} param.userAgent UA字符串
 * @param {Object} param.location 位置对象（JSON）
 * @param {boolean} param.success 是否登录成功
 * @param {string} [param.failReason] 失败原因
 */
export async function recordLogin({ userId, ip, fingerprint, userAgent, location, success, failReason }) {
  const ipEnc = encrypt(ip);
  const fingerprintEnc = fingerprint ? encrypt(fingerprint) : null;
  await pool.query(
    `INSERT INTO login_history (id, user_id, login_at, ip_enc, fingerprint_enc, user_agent, location, success, fail_reason)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8)`,
    [uuidv4(), userId, ipEnc, fingerprintEnc, userAgent, location ? JSON.stringify(location) : null, success, failReason || null]
  );
}

/**
 * 查询用户的登录历史（解密敏感字段）
 * @param {string} userId 用户ID
 * @param {number} [limit=20] 返回条数
 * @returns {Promise<Array>} 登录历史数组
 */
export async function getLoginHistory(userId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT id, login_at, ip_enc, fingerprint_enc, user_agent, location, success, fail_reason
     FROM login_history WHERE user_id = $1 ORDER BY login_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map(row => ({
    id: row.id,
    loginAt: row.login_at,
    ip: row.ip_enc ? decrypt(row.ip_enc) : null,
    fingerprint: row.fingerprint_enc ? decrypt(row.fingerprint_enc) : null,
    userAgent: row.user_agent,
    location: row.location,
    success: row.success,
    failReason: row.fail_reason
  }));
} 