/**
 * refresh_tokens.scope 列的自愈与查询构建。
 *
 * 背景：该项目的 DB 迁移不在 serverless 启动时执行（见 src/db/migration.js，
 * 注释明确「避免在 serverless 函数启动时执行 DDL」）。若生产库尚未跑迁移，
 * refresh_tokens 表不存在 scope 列，凡是引用该列的 INSERT/SELECT 都会报
 * `column "scope" of relation "refresh_tokens" does not exist`，
 * 直接打挂建/轮换 token，连登录都 500。
 *
 * 这里把「列是否可用」的探测/自愈以及各查询的「带 scope / 不带 scope」两种
 * 变体都抽成纯逻辑，既能保证登录/续期永不被打断，又便于单测。
 */

/**
 * 创建一个「确保 scope 列存在」的幂等探测器（每实例缓存一次）。
 * - 列已存在 => true
 * - 列缺失   => 尝试 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS scope TEXT`，成功 => true
 * - 出错（如无 DDL 权限）=> false，并清空缓存以便后续重试（本进程降级为不写 scope）
 *
 * @param {Object} deps
 * @param {() => Promise<{query: Function, release: Function}>} deps.connect 取连接
 * @param {(level: string, ...args: any[]) => void} [deps.log] 日志函数
 * @returns {(() => Promise<boolean>) & { reset: () => void }}
 */
export function createScopeColumnEnsurer({ connect, log = () => {} }) {
  let readyPromise = null;

  const ensure = async () => {
    if (readyPromise) {
      return readyPromise;
    }
    readyPromise = (async () => {
      const client = await connect();
      try {
        const { rows } = await client.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_name = 'refresh_tokens' AND column_name = 'scope' LIMIT 1`
        );
        if (rows.length > 0) {
          return true;
        }
        log('warn', '[RefreshToken] 检测到 refresh_tokens.scope 列缺失，正在自动补列 (ADD COLUMN IF NOT EXISTS)…');
        await client.query('ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS scope TEXT');
        log('warn', '[RefreshToken] refresh_tokens.scope 列已自动补齐');
        return true;
      } catch (error) {
        // 补列失败（如权限不足）：降级为不写 scope，保证登录/续期不被打断。
        readyPromise = null;
        log('error', '[RefreshToken] 自动补 scope 列失败，本进程降级为不持久化 scope（登录/续期仍可用）:', error);
        return false;
      } finally {
        client.release();
      }
    })();
    return readyPromise;
  };

  ensure.reset = () => {
    readyPromise = null;
  };

  return ensure;
}

/**
 * 构建 createToken 的 INSERT 查询（带/不带 scope 两种变体）。
 * @returns {{ name: string, text: string, values: any[] }}
 */
export function buildInsertTokenQuery(hasScope, { names, tokenData, parentId, clientId }) {
  const common = [
    tokenData.id,
    tokenData.userId,
    tokenData.encryptedToken,
    tokenData.deviceInfo,
    parentId,
    tokenData.expiresAt,
    tokenData.createdAt,
    clientId,
  ];
  if (hasScope) {
    return {
      name: names.withScope,
      text: `
        INSERT INTO refresh_tokens
          (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id, scope)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)
      `,
      values: [...common, tokenData.scope ?? null],
    };
  }
  return {
    name: names.noScope,
    text: `
        INSERT INTO refresh_tokens
          (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
      `,
    values: common,
  };
}

/**
 * 构建轮换时写入子令牌的 INSERT 查询（带/不带 scope 两种变体）。
 * @returns {{ name: string, text: string, values: any[] }}
 */
export function buildRotateInsertQuery(hasScope, { names, tokenData, parentId, clientId, scope }) {
  const common = [
    tokenData.id,
    tokenData.userId,
    tokenData.encryptedToken,
    tokenData.deviceInfo,
    parentId,
    tokenData.expiresAt,
    tokenData.createdAt,
    clientId,
  ];
  if (hasScope) {
    return {
      name: names.withScope,
      text: `
        INSERT INTO refresh_tokens
          (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id, scope)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)
      `,
      values: [...common, scope ?? null],
    };
  }
  return {
    name: names.noScope,
    text: `
        INSERT INTO refresh_tokens
          (id, user_id, token, device_info, parent_id, expires_at, created_at, last_used_at, client_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
      `,
    values: common,
  };
}

/**
 * 按 id 取令牌的 SELECT 文本（带/不带 scope 列）。
 * @returns {string}
 */
export function buildSelectTokenByIdText(hasScope) {
  const cols = hasScope
    ? 'id, user_id, token, revoked, expires_at, created_at, client_id, scope'
    : 'id, user_id, token, revoked, expires_at, created_at, client_id';
  return `
          SELECT ${cols}
          FROM refresh_tokens
          WHERE id = $1
          LIMIT 1
        `;
}

/**
 * 宽限窗口内查找替代子令牌的 SELECT 文本（带/不带 scope 列）。
 * @returns {string}
 */
export function buildFindReplacementText(hasScope) {
  const cols = hasScope
    ? 'id, token, expires_at, created_at, scope'
    : 'id, token, expires_at, created_at';
  return `
          SELECT ${cols}
          FROM refresh_tokens
          WHERE parent_id = $1 AND revoked = FALSE
          ORDER BY created_at DESC
          LIMIT 1
        `;
}
