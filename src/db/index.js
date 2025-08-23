/**
 * Vercel Serverless真正共享连接池解决方案
 * 使用外部连接池彻底解决连接超时问题
 */
import pkg from 'pg';
const { Pool } = pkg;
import { DATABASE_URL, DATABASE_SSL } from '../config/env.js';

// 详细日志函数
function dbLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [DB-${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
}

// 真正的全局单例连接池 - 跨函数实例共享
let sharedPool = null;

// 智能连接字符串检测和优化
function optimizeConnectionString(originalUrl) {
  dbLog('info', 'Analyzing database connection string for pooling optimization');
  
  // 检查是否已经是连接池URL
  if (originalUrl.includes('pooler.supabase.com') || originalUrl.includes('pgbouncer') || originalUrl.includes(':6543')) {
    dbLog('info', 'Detected connection pooling URL - using as-is');
    return originalUrl;
  }
  
  // 如果是Supabase直连，转换为事务模式连接池
  if (originalUrl.includes('.supabase.co:5432')) {
    const pooledUrl = originalUrl.replace('.supabase.co:5432', '.pooler.supabase.com:6543');
    dbLog('info', 'Converting Supabase direct connection to transaction mode pooler', {
      from: 'direct connection (5432)',
      to: 'transaction pooler (6543)'
    });
    return pooledUrl;
  }
  
  dbLog('warn', 'Using direct database connection - consider using connection pooler for better performance');
  return originalUrl;
}

// 创建真正共享的连接池
function createSharedPool() {
  if (sharedPool && !sharedPool.ended) {
    dbLog('info', 'Reusing existing shared connection pool');
    return sharedPool;
  }

  dbLog('info', 'Creating new shared connection pool for Vercel serverless environment');
  
  const optimizedUrl = optimizeConnectionString(DATABASE_URL);
  
  sharedPool = new Pool({
    connectionString: optimizedUrl,
    ssl: DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    
    // Serverless优化的连接池配置
    max: 5,    // 小连接池，依赖外部连接池
    min: 0,    // 无最小连接，让serverless按需创建
    idle: 10,  // 10ms快速释放，依赖外部连接池
    
    // 超时配置 - 适合serverless快速响应
    connectionTimeoutMillis: 10000,  // 10秒连接超时
    idleTimeoutMillis: 1000,        // 1秒空闲超时
    query_timeout: 30000,           // 30秒查询超时
    acquireTimeoutMillis: 5000,     // 5秒获取连接超时
    
    // Serverless环境优化
    allowExitOnIdle: true,
    application_name: 'auth_system_serverless',
    
    // 禁用prepared statements（PgBouncer事务模式要求）
    statement_timeout: 30000,
  });

  // 连接池监控和日志
  sharedPool.on('connect', (client) => {
    dbLog('debug', 'Client connected to shared pool', { 
      total: sharedPool.totalCount,
      idle: sharedPool.idleCount,
      waiting: sharedPool.waitingCount,
      processId: process.pid
    });
  });

  sharedPool.on('acquire', () => {
    dbLog('debug', 'Client acquired from shared pool', {
      total: sharedPool.totalCount,
      idle: sharedPool.idleCount,
      waiting: sharedPool.waitingCount
    });
  });

  sharedPool.on('error', (err, client) => {
    dbLog('error', 'Shared pool error', { 
      error: err.message, 
      code: err.code,
      total: sharedPool.totalCount,
      idle: sharedPool.idleCount,
      waiting: sharedPool.waitingCount
    });
  });

  sharedPool.on('remove', () => {
    dbLog('debug', 'Client removed from shared pool');
  });

  // 进程退出时清理连接池
  process.on('beforeExit', async () => {
    if (sharedPool && !sharedPool.ended) {
      dbLog('info', 'Closing shared connection pool on process exit');
      await sharedPool.end();
    }
  });

  dbLog('info', 'Shared connection pool created successfully', {
    maxConnections: sharedPool.options.max,
    connectionString: optimizedUrl.replace(/:[^:@]*@/, ':***@') // 隐藏密码
  });
  
  return sharedPool;
}

// 懒加载的连接池实例
let _pool = null;

// 获取连接池实例（懒加载模式）
export function getPool() {
  if (!_pool) {
    _pool = createSharedPool();
  }
  return _pool;
}

// 🔥 强制性解决方案：让所有pool调用都自动使用智能连接
export const pool = new Proxy({}, {
  get(target, prop) {
    const actualPool = getPool();
    
    // 如果是query方法，自动使用smartQuery
    if (prop === 'query') {
      return async (text, params) => {
        try {
          await ensureInitialized(); // 确保数据库已初始化
          return await actualPool.query(text, params);
        } catch (error) {
          dbLog('error', 'Pool query failed', {
            error: error.message,
            code: error.code,
            query: text.substring(0, 100) + '...'
          });
          throw error;
        }
      };
    }
    
    // 如果是connect方法，自动使用smartConnect
    if (prop === 'connect') {
      return async () => {
        await ensureInitialized(); // 确保数据库已初始化
        return await actualPool.connect();
      };
    }
    
    // 其他属性直接返回
    const value = actualPool[prop];
    return typeof value === 'function' ? value.bind(actualPool) : value;
  }
});

// 🔥 懒加载数据库初始化状态
let _initializationPromise = null;
let _isInitialized = false;

// 懒加载数据库初始化 - 只在真正需要时执行
export async function ensureInitialized() {
  // 如果已经初始化，直接返回
  if (_isInitialized) {
    dbLog('debug', 'Database already initialized, skipping');
    return;
  }
  
  // 如果正在初始化，等待现有的初始化完成
  if (_initializationPromise) {
    dbLog('debug', 'Database initialization in progress, waiting...');
    return await _initializationPromise;
  }
  
  // 开始新的初始化过程
  dbLog('info', 'Starting lazy database initialization');
  _initializationPromise = performInitialization();
  
  try {
    await _initializationPromise;
    _isInitialized = true;
    dbLog('info', 'Lazy database initialization completed successfully');
  } catch (error) {
    // 初始化失败，重置状态以允许重试
    _initializationPromise = null;
    dbLog('error', 'Lazy database initialization failed', {
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

// 实际的初始化逻辑
async function performInitialization() {
  const initStartTime = Date.now();
  
  try {
    // 先快速测试连接
    await quickConnectTest();
    
    // 然后执行必要的DDL（只在真正需要时）
    // await init(); // <--- 移除这行，避免在运行时执行DDL
    
    const totalDuration = Date.now() - initStartTime;
    dbLog('info', 'Database initialization performance metrics', { 
      totalDuration: `${totalDuration}ms`,
      poolStats: {
        total: getPool().totalCount,
        idle: getPool().idleCount,
        waiting: getPool().waitingCount
      }
    });
    
  } catch (error) {
    const totalDuration = Date.now() - initStartTime;
    dbLog('error', 'Database initialization failed in performInitialization', {
      totalDuration: `${totalDuration}ms`,
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

// 快速连接测试函数
export async function quickConnectTest() {
  const startTime = Date.now();
  let client;
  
  try {
    dbLog('info', 'Performing quick connection test');
    
    const actualPool = getPool(); // 使用懒加载的连接池
    client = await actualPool.connect();
    const result = await client.query('SELECT 1 as test');
    
    const duration = Date.now() - startTime;
    dbLog('info', 'Quick connection test successful', {
      duration: `${duration}ms`,
      result: result.rows[0]
    });
    
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLog('error', 'Quick connection test failed', {
      duration: `${duration}ms`,
      error: error.message,
      code: error.code
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 智能数据库操作包装器 - 自动触发初始化
export async function smartQuery(text, params) {
  await ensureInitialized();
  const actualPool = getPool();
  return await actualPool.query(text, params);
}

// 智能连接获取 - 自动触发初始化
export async function smartConnect() {
  await ensureInitialized();
  const actualPool = getPool();
  return await actualPool.connect();
}

// 连接健康检查
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
      currentTime: result.rows[0].current_time,
      version: result.rows[0].pg_version,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    });
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLog('error', 'Database health check failed', {
      duration: `${duration}ms`,
      error: error.message,
      code: error.code
    });
    throw error;
  } finally {
    if (client) {
      client.release();
      dbLog('debug', 'Database health check connection released');
    }
  }
}

// 数据库初始化重试机制
async function withRetry(operation, maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      dbLog('info', `Attempting database operation (attempt ${attempt}/${maxRetries})`);
      const result = await operation();
      dbLog('info', `Database operation succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      dbLog('error', `Database operation failed on attempt ${attempt}`, {
        error: error.message,
        code: error.code,
        attempt,
        maxRetries
      });
      
      if (attempt === maxRetries) {
        dbLog('error', 'All database operation attempts failed, throwing error');
        throw error;
      }
      
      dbLog('info', `Waiting ${delay}ms before retry attempt ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // 指数退避
    }
  }
}

// 分步执行DDL避免长事务
export async function init() {
  const initStartTime = Date.now();
  dbLog('info', 'Starting database initialization with optimized approach');
  
  try {
    // 先进行健康检查
    await withRetry(() => checkDatabaseHealth(), 3, 1000);
    
    // 分步创建表而不是单个巨大事务
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
            role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'))
          );
        `
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
        `
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
        `
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
        `
      },
      {
        name: '刷新令牌表',
        sql: `
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
        `
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
        `
      },
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
        `
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
        `
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
        `
      }
    ];

    // 逐步执行每个DDL
    for (const step of steps) {
      const stepStartTime = Date.now();
      dbLog('info', `Executing database step: ${step.name}`);
      
      await withRetry(async () => {
        const actualPool = getPool();
        const client = await actualPool.connect();
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

    // 初始化超级管理员
    dbLog('info', 'Initializing super admin');
    await withRetry(() => initializeSuperAdmin(), 3, 1000);
    
    const totalDuration = Date.now() - initStartTime;
    dbLog('info', 'Database initialization completed successfully', { 
      totalDuration: `${totalDuration}ms`,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    });

  } catch (error) {
    const totalDuration = Date.now() - initStartTime;
    dbLog('error', 'Database initialization failed completely', {
      totalDuration: `${totalDuration}ms`,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * 强化的超级管理员初始化
 */
async function initializeSuperAdmin() {
  const startTime = Date.now();
  let client;
  
  try {
    const { SUPER_ADMIN_ID } = await import('../config/env.js');
    if (!SUPER_ADMIN_ID) {
      dbLog('info', 'No super admin ID configured, skipping initialization');
      return;
    }

    dbLog('info', 'Starting super admin initialization', { adminId: SUPER_ADMIN_ID });
    
    const actualPool = getPool();
    client = await actualPool.connect();
    const { rows } = await client.query('SELECT role FROM users WHERE id = $1 LIMIT 1', [SUPER_ADMIN_ID]);
    
    if (rows.length > 0 && rows[0].role !== 'super_admin') {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', ['super_admin', SUPER_ADMIN_ID]);
      const duration = Date.now() - startTime;
      dbLog('info', 'Super admin role updated successfully', { 
        adminId: SUPER_ADMIN_ID,
        duration: `${duration}ms`
      });
    } else if (rows.length === 0) {
      dbLog('warn', 'Super admin user not found in database', { adminId: SUPER_ADMIN_ID });
    } else {
      dbLog('info', 'Super admin already has correct role', { adminId: SUPER_ADMIN_ID });
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLog('error', 'Super admin initialization failed', {
      duration: `${duration}ms`,
      error: error.message,
      code: error.code
    });
    // 不抛出错误，允许应用继续启动
  } finally {
    if (client) {
      client.release();
      dbLog('debug', 'Super admin initialization connection released');
    }
  }
}