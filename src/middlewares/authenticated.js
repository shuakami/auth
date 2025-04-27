import { verifyAccessToken } from '../auth/jwt.js';

/**
 * Access Token认证中间件，替换原Session认证
 * 检查Authorization: Bearer <token>，校验通过后将用户信息挂载到req.user
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
  req.user = { id: payload.uid };
  next();
}
