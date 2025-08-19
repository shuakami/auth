/**
 * Vercel优化的Postgres连接池
 * 专为无服务器环境设计 - 极简高效
 */
import pkg from 'pg';
const { Pool } = pkg;
import { DATABASE_URL, DATABASE_SSL } from '../config/env.js';

// Vercel极简连接配置 - 追求速度优先
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 1, // 单连接
  min: 0, // 最小0连接
  idle: 500, // 0.5秒空闲
  connectionTimeoutMillis: 3000, // 3秒连接超时
  idleTimeoutMillis: 5000, // 5秒空闲超时
  query_timeout: 15000, // 15秒查询超时
  acquireTimeoutMillis: 3000, // 3秒获取连接超时
  allowExitOnIdle: true,
});

// 极简错误处理
pool.on('error', (err) => {
  console.error('[DB]', err.code || err.message);
});

export async function init() {
  console.log('[DB] Initializing database...');
  
  try {
    // 单一事务执行所有DDL - 避免多次连接
    await pool.query(`
      BEGIN;
      
      -- 核心用户表
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password_hash TEXT,
        github_id TEXT,
        google_id TEXT,
        verified BOOLEAN DEFAULT FALSE,
        totp_secret TEXT,
        totp_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'))
      );

      -- 会话表
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

      -- 备份码表
      CREATE TABLE IF NOT EXISTS backup_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user_id" ON backup_codes (user_id);

      -- 密码重置表
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        request_ip TEXT,
        used_at TIMESTAMP WITH TIME ZONE,
        used_ip TEXT,
        used_user_agent TEXT,
        verification_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_user_id" ON password_reset_tokens (user_id);
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_token" ON password_reset_tokens (token);

      -- 刷新令牌表
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        device_info TEXT,
        parent_id UUID,
        revoked BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE,
        reason TEXT
      );
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON refresh_tokens (user_id);
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token" ON refresh_tokens (token);

      -- 登录历史表
      CREATE TABLE IF NOT EXISTS login_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_enc TEXT NOT NULL,
        fingerprint_enc TEXT,
        user_agent TEXT,
        location JSONB,
        success BOOLEAN,
        fail_reason TEXT,
        login_method TEXT DEFAULT 'password',
        device_type TEXT DEFAULT 'unknown'
      );
      CREATE INDEX IF NOT EXISTS "IDX_login_history_user_id" ON login_history (user_id);
      CREATE INDEX IF NOT EXISTS "IDX_login_history_login_at" ON login_history (login_at);

      -- OAuth应用表
      CREATE TABLE IF NOT EXISTS oauth_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        client_id VARCHAR(255) NOT NULL UNIQUE,
        client_secret VARCHAR(255) NOT NULL,
        redirect_uris TEXT NOT NULL,
        scopes TEXT NOT NULL,
        app_type VARCHAR(50) NOT NULL CHECK (app_type IN ('web', 'mobile', 'desktop', 'server')),
        is_active BOOLEAN DEFAULT TRUE,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_oauth_applications_client_id" ON oauth_applications (client_id);

      -- OAuth授权码表
      CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL UNIQUE,
        client_id VARCHAR(255) NOT NULL REFERENCES oauth_applications(client_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        redirect_uri TEXT NOT NULL,
        scopes TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_oauth_authorization_codes_code" ON oauth_authorization_codes (code);

      -- OAuth访问令牌表
      CREATE TABLE IF NOT EXISTS oauth_access_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        client_id VARCHAR(255) NOT NULL REFERENCES oauth_applications(client_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scopes TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_oauth_access_tokens_token_hash" ON oauth_access_tokens (token_hash);

      COMMIT;
    `);

    // 初始化超级管理员 - 独立快速查询
    await initializeSuperAdmin();
    
    console.log('[DB] Database initialized successfully.');

  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * 极简超级管理员初始化
 */
async function initializeSuperAdmin() {
  try {
    const { SUPER_ADMIN_ID } = await import('../config/env.js');
    if (!SUPER_ADMIN_ID) return;

    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1 LIMIT 1', [SUPER_ADMIN_ID]);
    
    if (rows.length > 0 && rows[0].role !== 'super_admin') {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['super_admin', SUPER_ADMIN_ID]);
      console.log(`[DB] Super admin ${SUPER_ADMIN_ID} initialized.`);
    }
  } catch (error) {
    // 静默处理超级管理员初始化失败
    console.error('[DB] Super admin init failed:', error.message);
  }
}