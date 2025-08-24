import { verifyAccessToken, verifyRefreshToken } from '../auth/jwt.js';
import { smartQuery } from '../db/index.js';

/**
 * Access Token认证中间件，替换原Session认证
 * 检查Authorization: Bearer <token> 或 Cookie，校验通过后将用户信息挂载到req.user
 * 同时尝试更新对应 Refresh Token 的 last_used_at 时间
 */
export function ensureAuth(req, res, next) {
  // 优先从Cookie获取Access Token
  let token = req.cookies.accessToken;
  // 若Cookie无Token，再查header
  if (!token) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权，缺少Access Token' });
    }
    token = authHeader.slice(7);
  }
  const payload = verifyAccessToken(token);
  if (!payload || !payload.uid) {
    return res.status(401).json({ error: '无效或过期的Access Token' });
  }
  // 挂载用户信息到req.user
  req.user = payload;

  // 异步更新 last_used_at
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    (async () => { // 使用 async IIFE 实现 "fire-and-forget"
      try {
        const rtPayload = verifyRefreshToken(refreshToken); // 仅解码获取 JTI
        if (rtPayload && rtPayload.jti) {
          // 使用智能查询，自动处理连接池和初始化
          await smartQuery(
            `UPDATE refresh_tokens 
             SET last_used_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < (CURRENT_TIMESTAMP - INTERVAL '5 minutes'))`,
            [rtPayload.jti]
          );
        }
      } catch (err) { 
        // 忽略解码/数据库错误，不影响主请求
        console.error(`[WARN] Failed to update last_used_at for a refresh token: ${err.message}`);
      }
    })();
  }

  next(); // 立即调用 next()，不等待更新完成
}
