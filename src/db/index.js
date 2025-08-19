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

  // 添加时间戳列
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    console.log("成功添加 'created_at' 列到 'users' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'created_at' 列已存在于 'users' 表。");
    } else {
      console.error("尝试添加 'created_at' 列时出错:", err);
    }
  }
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    console.log("成功添加 'updated_at' 列到 'users' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'updated_at' 列已存在于 'users' 表。");
    } else {
      console.error("尝试添加 'updated_at' 列时出错:", err);
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

    CREATE TABLE IF NOT EXISTS login_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ip_enc TEXT NOT NULL,
      fingerprint_enc TEXT,
      user_agent TEXT,
      location JSONB,
      success BOOLEAN,
      fail_reason TEXT
    );
    CREATE INDEX IF NOT EXISTS "IDX_login_history_user_id" ON login_history (user_id);
    CREATE INDEX IF NOT EXISTS "IDX_login_history_login_at" ON login_history (login_at);
  `);

  // 4. 添加新的列以支持重构后的服务
  // 为 login_history 表添加缺失的列
  try {
    await pool.query(`ALTER TABLE login_history ADD COLUMN login_method TEXT DEFAULT 'password';`);
    console.log("成功添加 'login_method' 列到 'login_history' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'login_method' 列已存在于 'login_history' 表。");
    } else {
      console.error("尝试添加 'login_method' 列时出错:", err);
    }
  }

  try {
    await pool.query(`ALTER TABLE login_history ADD COLUMN device_type TEXT DEFAULT 'unknown';`);
    console.log("成功添加 'device_type' 列到 'login_history' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'device_type' 列已存在于 'login_history' 表。");
    } else {
      console.error("尝试添加 'device_type' 列时出错:", err);
    }
  }

  // 为 refresh_tokens 表添加缺失的列
  try {
    await pool.query(`ALTER TABLE refresh_tokens ADD COLUMN reason TEXT;`);
    console.log("成功添加 'reason' 列到 'refresh_tokens' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'reason' 列已存在于 'refresh_tokens' 表。");
    } else {
      console.error("尝试添加 'reason' 列时出错:", err);
    }
  }

  // 为 password_reset_tokens 表添加缺失的列
  try {
    await pool.query(`ALTER TABLE password_reset_tokens ADD COLUMN request_ip TEXT;`);
    console.log("成功添加 'request_ip' 列到 'password_reset_tokens' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'request_ip' 列已存在于 'password_reset_tokens' 表。");
    } else {
      console.error("尝试添加 'request_ip' 列时出错:", err);
    }
  }

  try {
    await pool.query(`ALTER TABLE password_reset_tokens ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;`);
    console.log("成功添加 'used_at' 列到 'password_reset_tokens' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'used_at' 列已存在于 'password_reset_tokens' 表。");
    } else {
      console.error("尝试添加 'used_at' 列时出错:", err);
    }
  }

  try {
    await pool.query(`ALTER TABLE password_reset_tokens ADD COLUMN used_ip TEXT;`);
    console.log("成功添加 'used_ip' 列到 'password_reset_tokens' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'used_ip' 列已存在于 'password_reset_tokens' 表。");
    } else {
      console.error("尝试添加 'used_ip' 列时出错:", err);
    }
  }

  try {
    await pool.query(`ALTER TABLE password_reset_tokens ADD COLUMN used_user_agent TEXT;`);
    console.log("成功添加 'used_user_agent' 列到 'password_reset_tokens' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'used_user_agent' 列已存在于 'password_reset_tokens' 表。");
    } else {
      console.error("尝试添加 'used_user_agent' 列时出错:", err);
    }
  }

  try {
    await pool.query(`ALTER TABLE password_reset_tokens ADD COLUMN verification_count INTEGER DEFAULT 0;`);
    console.log("成功添加 'verification_count' 列到 'password_reset_tokens' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'verification_count' 列已存在于 'password_reset_tokens' 表。");
    } else {
      console.error("尝试添加 'verification_count' 列时出错:", err);
    }
  }

  // 为 users 表添加角色列
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));`);
    console.log("成功添加 'role' 列到 'users' 表。");
  } catch (err) {
    if (err.code === '42701') {
      console.log("'role' 列已存在于 'users' 表。");
    } else {
      console.error("尝试添加 'role' 列时出错:", err);
    }
  }

  console.log('数据库初始化检查完成。');

  // 初始化超级管理员权限
  await initializeSuperAdmin();
}

/**
 * 初始化超级管理员
 */
async function initializeSuperAdmin() {
  try {
    const { SUPER_ADMIN_ID } = await import('../config/env.js');
    
    if (!SUPER_ADMIN_ID) {
      console.log('[Permission] 未配置SUPER_ADMIN_ID，跳过超级管理员初始化');
      return;
    }

    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [SUPER_ADMIN_ID]);
    
    if (rows.length > 0) {
      const currentRole = rows[0].role;
      if (currentRole !== 'super_admin') {
        // 更新为超级管理员
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['super_admin', SUPER_ADMIN_ID]);
        console.log(`[Permission] 已将用户 ${SUPER_ADMIN_ID} 设置为超级管理员`);
      } else {
        console.log(`[Permission] 超级管理员 ${SUPER_ADMIN_ID} 权限正常`);
      }
    } else {
      console.warn(`[Permission] 超级管理员ID ${SUPER_ADMIN_ID} 对应的用户不存在，请先注册该账号`);
    }

  } catch (error) {
    console.error('[Permission] 初始化超级管理员失败:', error);
  }
}
