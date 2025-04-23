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

export async function createUser({ id, email, passwordHash = null, githubId = null, verified = false }) {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, github_id, verified)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, email, passwordHash, githubId, verified]
  );
  return { id, email, verified };
}

export async function setTotp(id, secret) {
  await pool.query('UPDATE users SET totp_secret = $1, totp_enabled = TRUE WHERE id = $2', [
    secret,
    id
  ]);
}

export async function getTotpSecret(id) {
  const row = (await pool.query('SELECT totp_secret FROM users WHERE id = $1', [id])).rows[0];
  return row ? row.totp_secret : null;
}
