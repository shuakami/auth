/**
 * 修正 oauth_applications.issue_refresh_token 的「默认关闭」脚枪。
 *
 * 历史 schema：`issue_refresh_token BOOLEAN DEFAULT FALSE`，导致绝大多数客户端
 * （含 dispatch）默认拿不到 refresh token → 无法续期。该项目的迁移不在 serverless
 * 启动时执行（见 src/db/migration.js），所以这里在授权码换取 token 前做一次性自愈：
 * 把存量客户端补成开启，并把列默认改成 TRUE。
 *
 * 幂等标记用「列默认值是否已为 TRUE」：迁移过一次后即跳过，因此不会反复覆盖
 * 管理员后续显式关闭（issue_refresh_token = FALSE）的设置。
 */

/**
 * 判断 information_schema 里的 column_default 是否表示 TRUE。
 * Postgres 通常返回 'true' / 'false' 字符串，无默认时为 null。
 * @param {string|null|undefined} columnDefault
 * @returns {boolean}
 */
export function isDefaultTrue(columnDefault) {
  return typeof columnDefault === 'string' && /true/i.test(columnDefault);
}

/**
 * 创建一个「确保 issue_refresh_token 默认开启」的幂等自愈器（每实例缓存一次）。
 * - 列默认已为 TRUE => 跳过（尊重后续显式关闭）
 * - 列默认非 TRUE   => backfill 存量为 TRUE，并把默认改成 TRUE
 * - 出错           => 返回 false 并清缓存以便后续重试（不影响主流程其余逻辑）
 *
 * @param {Object} deps
 * @param {() => Promise<{query: Function, release: Function}>} deps.connect 取连接
 * @param {(level: string, ...args: any[]) => void} [deps.log] 日志函数
 * @returns {(() => Promise<boolean>) & { reset: () => void }}
 */
export function createIssueRefreshTokenDefaultEnsurer({ connect, log = () => {} }) {
  let readyPromise = null;

  const ensure = async () => {
    if (readyPromise) {
      return readyPromise;
    }
    readyPromise = (async () => {
      const client = await connect();
      try {
        const { rows } = await client.query(
          `SELECT column_default FROM information_schema.columns
           WHERE table_name = 'oauth_applications' AND column_name = 'issue_refresh_token' LIMIT 1`
        );
        if (rows.length > 0 && isDefaultTrue(rows[0].column_default)) {
          return true; // 已迁移，尊重后续显式关闭
        }
        log('warn', '[OAuth] 检测到 issue_refresh_token 历史默认为关闭，正在一次性修正：backfill 存量客户端为开启并把默认改为 TRUE…');
        await client.query(
          `UPDATE oauth_applications SET issue_refresh_token = TRUE WHERE issue_refresh_token IS DISTINCT FROM TRUE`
        );
        await client.query(
          `ALTER TABLE oauth_applications ALTER COLUMN issue_refresh_token SET DEFAULT TRUE`
        );
        log('warn', '[OAuth] issue_refresh_token 默认已改为 TRUE，存量客户端已补为开启');
        return true;
      } catch (error) {
        readyPromise = null;
        log('error', '[OAuth] 修正 issue_refresh_token 默认失败（不影响本次流程其余逻辑）:', error);
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
