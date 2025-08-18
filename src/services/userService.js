import { pool } from '../db/index.js';

export async function findByEmail(email) {
  return (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0] || null;
}

export async function findById(id) {
  return (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0] || null;
}

export async function findByGithubId(githubId) {
  return (await pool.query('SELECT * FROM users WHERE github_id = $1', [githubId])).rows[0] || null;
}

export async function findByGoogleId(googleId) {
  return (await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId])).rows[0] || null;
}

export async function findByUsername(username) {
  return (await pool.query('SELECT * FROM users WHERE username = $1', [username])).rows[0] || null;
}

export async function createUser({ id, email, username = null, passwordHash = null, githubId = null, googleId = null, verified = false }) {
  await pool.query(
    `INSERT INTO users (id, email, username, password_hash, github_id, google_id, verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, email, username, passwordHash, githubId, googleId, verified]
  );
  return { id, email, username, verified };
}

export async function setTotp(id, secret) {
  await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [
    secret,
    id
  ]);
}

export async function enableTotp(id) {
  await pool.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [id]);
}

export async function getTotpSecret(id) {
  const row = (await pool.query('SELECT totp_secret FROM users WHERE id = $1', [id])).rows[0];
  return row ? row.totp_secret : null;
}

export async function bindGithubId(userId, githubId) {
  await pool.query('UPDATE users SET github_id = $1 WHERE id = $2', [githubId, userId]);
}

export async function bindGoogleId(userId, googleId) {
  await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, userId]);
}

export async function updateEmail(userId, email) {
  await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
}

export async function updateUsername(userId, username) {
  await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
}

export async function deleteUser(userId) {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

export async function migratePasswordHash(userId, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
}

// 已废弃Session相关方法，无需清理其他会话
// export async function clearOtherSessions(userId, currentSid) {
//   const { rows } = await pool.query('SELECT sid, sess FROM session');
//   const toDelete = rows.filter(row => {
//     try {
//       const sess = typeof row.sess === 'string' ? JSON.parse(row.sess) : row.sess;
//       return sess?.passport?.user === userId && row.sid !== currentSid;
//     } catch {
//       return false;
//     }
//   });
//   if (toDelete.length > 0) {
//     const sids = toDelete.map(row => row.sid);
//     await pool.query('DELETE FROM session WHERE sid = ANY($1)', [sids]);
//   }
// }

export async function disableTotp(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = $1', [userId]);
    await client.query('DELETE FROM backup_codes WHERE user_id = $1', [userId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateEmailVerified(userId, verified) {
  await pool.query('UPDATE users SET verified = $1 WHERE id = $2', [verified, userId]);
}
