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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      github_id TEXT,
      verified BOOLEAN DEFAULT FALSE,
      totp_secret TEXT,
      totp_enabled BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    )
    WITH (OIDS=FALSE);

    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

    -- 备份码表，用于存储用户的一次性备份码
    CREATE TABLE IF NOT EXISTS backup_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,  -- 使用 bcrypt 哈希存储
      used BOOLEAN DEFAULT FALSE,  -- 标记是否已使用
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP WITH TIME ZONE  -- 使用时间，初始为 NULL
    );

    -- 为 backup_codes 表创建索引以加速查询
    CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user_id" ON backup_codes (user_id);
    CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user_id_used" ON backup_codes (user_id, used);
  `);
}
