import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { pool } from '../db/index.js';
import * as User from './userService.js';
import { sendResetPasswordEmail } from '../mail/resend.js';
import { PUBLIC_BASE_URL } from '../config/env.js';

// 生成重置密码 token 并发送邮件
export async function createResetToken(email, expiresIn = 30 * 60 * 1000) {
  const user = await User.findByEmail(email);
  if (!user) return { exists: false };
  const token = uuidv4() + uuidv4();
  const expiresAt = new Date(Date.now() + expiresIn);
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt]
  );
  const link = `${PUBLIC_BASE_URL}/login/reset?token=${token}`;
  await sendResetPasswordEmail(email, link);
  return { exists: true };
}

// 校验 token 是否有效，返回 user
export async function verifyResetToken(token) {
  const result = await pool.query(
    `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token]
  );
  if (!result.rows[0]) return null;
  const user = await User.findById(result.rows[0].user_id);
  return user;
}

// 重置密码并失效 token
export async function resetPassword(token, newPassword) {
  const result = await pool.query(
    `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token]
  );
  const row = result.rows[0];
  if (!row) return false;
  const user = await User.findById(row.user_id);
  if (!user) return false;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, user.id]
  );
  await pool.query(
    `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
    [row.id]
  );
  return true;
} 