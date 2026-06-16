/**
 * Vercel Serverless 共享连接池
 */

import pkg from 'pg';
const { Pool } = pkg;
import { DATABASE_URL, DATABASE_SSL, SUPER_ADMIN_ID } from '../config/env.js';

/* --------------------------- 日志子系统（高性能） --------------------------- */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const DEFAULT_LEVEL =
  (process.env.DB_LOG_LEVEL && process.env.DB_LOG_LEVEL.toLowerCase()) ||
  (process.env.NODE_ENV === 'production' ? 'warn' : 'info');
const CURRENT_LEVEL = LEVELS[DEFAULT_LEVEL] ?? LEVELS.info;

// 尽量避免 JSON.stringify 成为热路径开销
function safeSerialize(data, maxLen = 4000) {
  try {
    if (data == null) return '';
    if (typeof data === 'string') return data.length > maxLen ? data.slice(0, maxLen) + '…(truncated)' : data;
    const s = JSON.stringify(data);
    return s.length > maxLen ? s.slice(0, maxLen) + '…(truncated)' : s;
  } catch {
    return '[unserializable]';
  }
}

function dbLog(level, message, data) {
  const lv = LEVELS[level] ?? LEVELS.info;
  if (lv > CURRENT_LEVEL) return;

  const ts = new Date().toISOString();
  const line = `${ts} [DB-${level.toUpperCase()}] ${message}`;
  if (data !== undefined) {
    const payload = safeSerialize(data);
    if (lv <= LEVELS.error) {
      console.error(line, payload);
    } else {
      console.log(line, payload);
    }
  } else {
    if (lv <= LEVELS.error) {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}

/* --------------------------- 全局单例与键名 --------------------------- */

const GLOBAL_POOL_KEY = Symbol.for('auth_system.shared_pg_pool');
const GLOBAL_INIT_PROMISE_KEY = Symbol.for('auth_system.pg_init_promise');
const GLOBAL_INIT_DONE_KEY = Symbol.for('auth_system.pg_init_done');

/* --------------------------- 连接字符串优化 --------------------------- */

function maskPassword(urlStr) {
  try {
    return urlStr.replace(/:[^:@]*@/, ':***@');
  } catch {
    return urlStr;
  }
}

function optimizeConnectionString(originalUrl) {
  dbLog('info', 'Analyzing database connection string for pooling optimization');

  // 已是 Pooler 或 PgBouncer
  if (
    originalUrl.includes('pooler.supabase.com') ||
    originalUrl.includes('pgbouncer') ||
    originalUrl.includes(':6543')
  ) {
    dbLog('info', 'Detected connection pooling URL - using as-is');
    return originalUrl;
  }

  // Supabase 直连 -> 事务池 6543
  if (originalUrl.includes('.supabase.co:5432')) {
    const pooledUrl = originalUrl.replace('.supabase.co:5432', '.pooler.supabase.com:6543');
    dbLog('info', 'Converting Supabase direct connection to transaction mode pooler', {
      from: 'direct connection (5432)',
      to: 'transaction pooler (6543)',
    });
    return pooledUrl;
  }

  dbLog('warn', 'Using direct database connection - consider using connection pooler for better performance');
  return originalUrl;
}

/* --------------------------- Pool 配置（有效且可调） --------------------------- */

function buildPoolOptions(optimizedUrl) {
  // 提供 ENV 可覆盖，保持默认值科学
  const max = parseInt(process.env.PG_POOL_MAX || '6', 10); // 小池，依赖外部池
  const idleTimeoutMillis = parseInt(process.env.PG_IDLE_TIMEOUT_MS || '5000', 10); // 减少重连抖动
  const connectionTimeoutMillis = parseInt(process.env.PG_CONN_TIMEOUT_MS || '10000', 10);
  const query_timeout = parseInt(process.env.PG_QUERY_TIMEOUT_MS || '30000', 10);
  const maxUses = parseInt(process.env.PG_MAX_USES || '2048', 10); // 循环使用次数，降低服务器端内存碎片
  const maxLifetimeSeconds = parseInt(process.env.PG_MAX_LIFETIME_S || '300', 10); // 主动轮换

  // `pg` 支持 keepAlive，降低网络设备/NAT 断流导致的长尾
  return {
    connectionString: optimizedUrl,
    ssl: DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    query_timeout,
    keepAlive: true,
    keepAliveInitialDelayMillis: 1000,
    allowExitOnIdle: true,
    application_name: 'auth_system_serverless',
    maxUses, // >= 8.11 支持；低版本忽略也不影响
    maxLifetimeSeconds, // >= 8.11 支持；低版本忽略也不影响
  };
}

/* --------------------------- 创建/获取共享连接池 --------------------------- */

function createSharedPool() {
  const optimizedUrl = optimizeConnectionString(DATABASE_URL);
  const options = buildPoolOptions(optimizedUrl);

  dbLog('info', 'Creating new shared connection pool for Vercel serverless environment', {
    connectionString: maskPassword(optimizedUrl),
    options: { ...options, connectionString: undefined }, // 避免把 URL 打到日志
  });

  const pool = new Pool(options);

  // 连接池监控与日志（降频）
  pool.on('connect', () => {
    dbLog('debug', 'Client connected to shared pool', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      processId: process.pid,
    });
  });

  pool.on('acquire', () => {
    dbLog('debug', 'Client acquired from shared pool', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  });

  pool.on('error', (err) => {
    dbLog('error', 'Shared pool error', {
      error: err?.message,
      code: err?.code,
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  });

  pool.on('remove', () => {
    dbLog('debug', 'Client removed from shared pool');
  });

  // Serverless 环境下无需强制 end；保持 beforeExit 友好
  process.on('beforeExit', async () => {
    try {
      if (!pool.ended) {
        dbLog('info', 'Closing shared connection pool on process exit');
        await pool.end();
      }
    } catch (e) {
      dbLog('warn', 'Error while closing pool on process exit', { error: e?.message });
    }
  });

  dbLog('info', 'Shared connection pool created successfully', {
    maxConnections: pool.options?.max,
    connectionString: maskPassword(optimizedUrl),
  });

  return pool;
}

// 获取全局单例（跨模块/多入口安全）
export function getPool() {
  const g = globalThis;
  let shared = g[GLOBAL_POOL_KEY];

  if (shared && !shared.ended) {
    dbLog('info', 'Reusing existing shared connection pool');
    return shared;
  }

  shared = createSharedPool();
  g[GLOBAL_POOL_KEY] = shared;
  return shared;
}

/* --------------------------- 智能初始化（去抖 + 快速） --------------------------- */

export async function quickConnectTest() {
  const startTime = Date.now();
  let client;

  try {
    dbLog('info', 'Performing quick connection test');
    const p = getPool();
    client = await p.connect();
    const result = await client.query('SELECT 1 as test');

    const duration = Date.now() - startTime;
    dbLog('info', 'Quick connection test successful', {
      duration: `${duration}ms`,
      result: result.rows[0],
    });

    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLog('error', 'Quick connection test failed', {
      duration: `${duration}ms`,
      error: error?.message,
      code: error?.code,
    });
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function ensureInitialized() {
  const g = globalThis;

  if (g[GLOBAL_INIT_DONE_KEY]) {
    dbLog('debug', 'Database already initialized, skipping');
    return;
  }

  if (g[GLOBAL_INIT_PROMISE_KEY]) {
    dbLog('debug', 'Database initialization in progress, waiting...');
    return g[GLOBAL_INIT_PROMISE_KEY];
  }

  dbLog('info', 'Starting lazy database initialization');
  g[GLOBAL_INIT_PROMISE_KEY] = performInitialization()
    .then(() => {
      g[GLOBAL_INIT_DONE_KEY] = true;
    })
    .finally(() => {
      g[GLOBAL_INIT_PROMISE_KEY] = null;
    });

  return g[GLOBAL_INIT_PROMISE_KEY];
}

async function performInitialization() {
  const initStartTime = Date.now();
  try {
    const p = getPool();

    // 如果已有连接（热路径），可跳过 quick test
    if (p.totalCount === 0) {
      await quickConnectTest();
    } else {
      dbLog('info', 'Pool already has active clients, skipping quick test');
    }

    const totalDuration = Date.now() - initStartTime;
    dbLog('info', 'Database initialization performance metrics', {
      totalDuration: `${totalDuration}ms`,
      poolStats: {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - initStartTime;
    dbLog('error', 'Database initialization failed in performInitialization', {
      totalDuration: `${totalDuration}ms`,
      error: error?.message,
      code: error?.code,
    });
    throw error;
  }
}

/* --------------------------- 智能操作包装（API 不变） --------------------------- */

export const pool = new Proxy(
  {},
  {
    get(_target, prop) {
      const actualPool = getPool();

      if (prop === 'query') {
        return async (text, params) => {
          try {
            await ensureInitialized(); // 确保数据库已初始化
            return await actualPool.query(text, params);
          } catch (error) {
            dbLog('error', 'Pool query failed', {
              error: error?.message,
              code: error?.code,
              query: typeof text === 'string' ? text.substring(0, 200) + '...' : '[QueryConfig]',
            });
            throw error;
          }
        };
      }

      if (prop === 'connect') {
        return async () => {
          await ensureInitialized(); // 确保数据库已初始化
          return actualPool.connect();
        };
      }

      const value = actualPool[prop];
      return typeof value === 'function' ? value.bind(actualPool) : value;
    },
  },
);

export async function smartQuery(text, params) {
  await ensureInitialized();
  return getPool().query(text, params);
}

export async function smartConnect() {
  await ensureInitialized();
  return getPool().connect();
}

/* --------------------------- 健康检查 --------------------------- */

export async function checkDatabaseHealth() {
  const startTime = Date.now();
  let client;

  try {
    dbLog('info', 'Starting database health check');
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');

    const duration = Date.now() - startTime;
    dbLog('info', 'Database health check passed', {
      duration: `${duration}ms`,
      currentTime: result.rows[0]?.current_time,
      version: result.rows[0]?.pg_version,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLog('error', 'Database health check failed', {
      duration: `${duration}ms`,
      error: error?.message,
      code: error?.code,
    });
    throw error;
  } finally {
    if (client) {
      client.release();
      dbLog('debug', 'Database health check connection released');
    }
  }
}

/* --------------------------- 重试器（指数退避） --------------------------- */

async function withRetry(operation, maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      dbLog('info', `Attempting database operation (attempt ${attempt}/${maxRetries})`);
      const result = await operation();
      dbLog('info', `Database operation succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      dbLog('error', `Database operation failed on attempt ${attempt}`, {
        error: error?.message,
        code: error?.code,
        attempt,
        maxRetries,
      });

      if (attempt === maxRetries) {
        dbLog('error', 'All database operation attempts failed, throwing error');
        throw error;
      }

      dbLog('info', `Waiting ${delay}ms before retry attempt ${attempt + 1}`);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.ceil(delay * 1.5);
    }
  }
}

/* --------------------------- 初始化（仅修复顺序，不改结构） --------------------------- */

export async function init() {
  const initStartTime = Date.now();
  dbLog('info', 'Starting database initialization with optimized approach');

  try {
    // 先进行健康检查
    await withRetry(() => checkDatabaseHealth(), 3, 1000);

    // —— 只修复执行顺序，确保外键引用的表已存在 ——
    const steps = [
      {
        name: '核心用户表',
        sql: `
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
            role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
            locale TEXT DEFAULT 'zh' CHECK (locale IN ('zh', 'en'))
          );
        `,
      },
      {
        name: '会话管理表',
        sql: `
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          );
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `,
      },
      // —— 先创建 oauth_applications，供后续外键引用 ——
      {
        name: 'OAuth应用表',
        sql: `
          CREATE TABLE IF NOT EXISTS oauth_applications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            client_id VARCHAR(255) NOT NULL UNIQUE,
            client_secret VARCHAR(255) NOT NULL,
            redirect_uris TEXT NOT NULL,
            scopes TEXT NOT NULL,
            app_type VARCHAR(50) NOT NULL CHECK (app_type IN ('web', 'mobile', 'desktop', 'server')),
            issue_refresh_token BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS "IDX_oauth_applications_client_id" ON oauth_applications (client_id);
        `,
      },
      {
        name: '备份码表',
        sql: `
          CREATE TABLE IF NOT EXISTS backup_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code_hash TEXT NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP WITH TIME ZONE
          );
          CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user_id" ON backup_codes (user_id);
        `,
      },
      {
        name: '密码重置表',
        sql: `
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
        `,
      },
      // —— 下面这些表会引用 oauth_applications.client_id，因此放在其后 ——
      {
        name: '刷新令牌表',
        sql: `
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            device_info TEXT,
            client_id VARCHAR(255) REFERENCES oauth_applications(client_id) ON DELETE SET NULL,
            parent_id UUID,
            revoked BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP WITH TIME ZONE,
            reason TEXT
          );
          CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON refresh_tokens (user_id);
          CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token" ON refresh_tokens (token);
        `,
      },
      {
        name: '登录历史表',
        sql: `
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
        `,
      },
      {
        name: 'WebAuthn凭据表',
        sql: `
          CREATE TABLE IF NOT EXISTS webauthn_credentials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            credential_id TEXT NOT NULL UNIQUE,
            credential_public_key BYTEA NOT NULL,
            counter BIGINT NOT NULL DEFAULT 0,
            credential_device_type TEXT NOT NULL DEFAULT 'unknown',
            credential_backed_up BOOLEAN NOT NULL DEFAULT FALSE,
            transports TEXT,
            name TEXT NOT NULL DEFAULT 'Biometric Device',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_user_id" ON webauthn_credentials (user_id);
          CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_credential_id" ON webauthn_credentials (credential_id);
        `,
      },
      {
        name: 'WebAuthn挑战表',
        sql: `
          CREATE TABLE IF NOT EXISTS webauthn_challenges (
            user_id TEXT NOT NULL,
            challenge_type TEXT NOT NULL,
            challenge_value TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, challenge_type)
          );
          CREATE INDEX IF NOT EXISTS "IDX_webauthn_challenges_expires" ON webauthn_challenges (expires_at);
        `,
      },
      {
        name: 'OAuth授权码表',
        sql: `
          CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(255) NOT NULL UNIQUE,
            client_id VARCHAR(255) NOT NULL REFERENCES oauth_applications(client_id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            redirect_uri TEXT NOT NULL,
            scopes TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            code_challenge TEXT,
            code_challenge_method VARCHAR(50)
          );
          CREATE INDEX IF NOT EXISTS "IDX_oauth_authorization_codes_code" ON oauth_authorization_codes (code);
        `,
      },
      {
        name: 'OAuth访问令牌表',
        sql: `
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
        `,
      },
    ];

    // 逐步执行每个 DDL（短事务 + 指数退避）
    for (const step of steps) {
      const stepStartTime = Date.now();
      dbLog('info', `Executing database step: ${step.name}`);

      await withRetry(async () => {
        const client = await getPool().connect();
        try {
          await client.query(step.sql);
          return true;
        } finally {
          client.release();
        }
      }, 3, 1000);

      const stepDuration = Date.now() - stepStartTime;
      dbLog('info', `Step completed: ${step.name}`, { duration: `${stepDuration}ms` });
    }

    // 迁移：为现有 users 表添加 locale 字段（如果不存在）
    dbLog('info', 'Running migration: add locale column to users table');
    await withRetry(async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'locale'
            ) THEN
              ALTER TABLE users ADD COLUMN locale TEXT DEFAULT 'zh' CHECK (locale IN ('zh', 'en'));
            END IF;
          END $$;
        `);
        return true;
      } finally {
        client.release();
      }
    }, 3, 1000);
    dbLog('info', 'Migration completed: locale column');

    // 初始化超级管理员
    dbLog('info', 'Initializing super admin');
    await withRetry(() => initializeSuperAdmin(), 3, 1000);

    const totalDuration = Date.now() - initStartTime;
    dbLog('info', 'Database initialization completed successfully', {
      totalDuration: `${totalDuration}ms`,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - initStartTime;
    dbLog('error', 'Database initialization failed completely', {
      totalDuration: `${totalDuration}ms`,
      error: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    throw error;
  }
}

/* --------------------------- 强化的超级管理员初始化 --------------------------- */

async function initializeSuperAdmin() {
  const startTime = Date.now();
  let client;

  try {
    const adminId = SUPER_ADMIN_ID;
    if (!adminId) {
      dbLog('info', 'No super admin ID configured, skipping initialization');
      return;
    }

    dbLog('info', 'Starting super admin initialization', { adminId });

    client = await getPool().connect();
    const { rows } = await client.query('SELECT role FROM users WHERE id = $1 LIMIT 1', [adminId]);

    if (rows.length > 0 && rows[0].role !== 'super_admin') {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', ['super_admin', adminId]);
      const duration = Date.now() - startTime;
      dbLog('info', 'Super admin role updated successfully', {
        adminId,
        duration: `${duration}ms`,
      });
    } else if (rows.length === 0) {
      dbLog('warn', 'Super admin user not found in database', { adminId });
    } else {
      dbLog('info', 'Super admin already has correct role', { adminId });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLog('error', 'Super admin initialization failed', {
      duration: `${duration}ms`,
      error: error?.message,
      code: error?.code,
    });
    // 不抛出错误，允许应用继续启动
  } finally {
    if (client) {
      client.release();
      dbLog('debug', 'Super admin initialization connection released');
    }
  }
}
