/**
 * Postgres 连接池
 * 使用 CommonJS pg 包，ESM 导入方式：
 *   import pkg from 'pg';
 *   const { Pool } = pkg;
 */

import pkg from 'pg';
const { Pool } = pkg;
import { DATABASE_URL, DATABASE_SSL } from '../config/env.js';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

export async function init() {
  // 1. 确保 users 表存在 (并且定义包含 username)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT,
      github_id TEXT,
      google_id TEXT,
      verified BOOLEAN DEFAULT FALSE,
      totp_secret TEXT,
      totp_enabled BOOLEAN DEFAULT FALSE
    );
  `);

  // 2. 尝试添加 username、google_id 列，防止表结构过旧
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN username TEXT UNIQUE;`);
    console.log("成功添加 'username' 列到 'users' 表 (或已存在)。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'username' 列已存在于 'users' 表。");
    } else {
      console.error("尝试添加 'username' 列时出错:", err);
      throw err;
    }
  }
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN google_id TEXT;`);
    console.log("成功添加 'google_id' 列到 'users' 表 (或已存在)。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'google_id' 列已存在于 'users' 表。");
    } else {
      console.error("尝试添加 'google_id' 列时出错:", err);
      throw err;
    }
  }

  // 3. 继续创建其他表和索引
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    )
    WITH (OIDS=FALSE);

    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

    CREATE TABLE IF NOT EXISTS backup_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user_id" ON backup_codes (user_id);
    CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user_id_used" ON backup_codes (user_id, used);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_user_id" ON password_reset_tokens (user_id);
    CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_token" ON password_reset_tokens (token);

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 主键
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 绑定用户
      token TEXT NOT NULL, -- Refresh Token 串（可为JWT或高强度随机串）
      device_info TEXT, -- 设备指纹或UA等信息
      parent_id UUID, -- 父Token（用于Token Rotation链）
      revoked BOOLEAN DEFAULT FALSE, -- 是否已失效/吊销
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 过期时间
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 创建时间
      last_used_at TIMESTAMP WITH TIME ZONE -- 最后一次使用时间
    );
    CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON refresh_tokens (user_id);
    CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token" ON refresh_tokens (token);
    CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_parent_id" ON refresh_tokens (parent_id);
  `);

  console.log('数据库初始化检查完成。');
}
