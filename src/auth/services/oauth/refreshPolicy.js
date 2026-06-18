/**
 * OAuth 刷新令牌策略（纯函数，便于单测）
 *
 * 这里集中两条与「token 续期」直接相关的决策逻辑：
 *  1. 授权码流程是否应当为客户端签发 refresh token；
 *  2. 续期时新 access token 应当采用的授权范围（scope）。
 *
 * 抽成纯函数是为了能在不依赖数据库 / 加密 / JWT 的情况下对其进行单元测试。
 */

/**
 * 是否应当为该客户端签发 refresh token。
 *
 * 过去要求同时满足 issue_refresh_token 且授权 scope 含 offline_access。但
 * 授权请求校验会把 scope 过滤为「客户端已注册 scope」的交集，若客户端注册时
 * 漏了 offline_access，则即使请求了也会被静默丢弃，导致「明明开了 issue_refresh_token
 * 却拿不到 refresh token / 普通登录无法续期」。issue_refresh_token 是管理员为该
 * 客户端显式开启的开关，应以它为准。
 *
 * @param {{ issue_refresh_token?: boolean }} clientApp
 * @returns {boolean}
 */
export function shouldIssueRefreshToken(clientApp) {
  return Boolean(clientApp && clientApp.issue_refresh_token);
}

/**
 * 续期时解析新 access token 的授权范围。
 *
 * 优先取持久化在 refresh token 上的 scope（数据库列），其次是 JWT 载荷中的 scope，
 * 最后回退为 null。之前仅取 payload.scope，但 refresh token 的 JWT 载荷原本不含 scope，
 * 导致续期后下发的 access token scope 为空，受 scope 保护的接口返回 insufficient_scope
 * （表现为「续期了会断」）。
 *
 * @param {{ scope?: string|null }|null|undefined} dbToken
 * @param {{ scope?: string|null }|null|undefined} payload
 * @returns {string|null}
 */
export function resolveRefreshScope(dbToken, payload) {
  return (dbToken && dbToken.scope) || (payload && payload.scope) || null;
}

/**
 * 构造 refresh token 的 JWT 载荷。
 *
 * scope 仅在存在时写入载荷，使授权范围随令牌轮换自然流转，并在数据库列缺失（如老令牌）
 * 时仍可从 JWT 还原。
 *
 * @param {{ id: string, userId: string, deviceInfo?: string, scope?: string|null }} params
 * @returns {{ jti: string, uid: string, device: string|undefined, scope?: string }}
 */
export function buildRefreshTokenPayload({ id, userId, deviceInfo, scope }) {
  const payload = {
    jti: id,
    uid: userId,
    device: deviceInfo,
  };
  if (scope) {
    payload.scope = scope;
  }
  return payload;
}
