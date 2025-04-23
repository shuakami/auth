/**
 * Postgres 连接池（Neon 免费层兼容）
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
  `);
}
