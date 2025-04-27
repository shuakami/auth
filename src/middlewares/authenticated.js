export function ensureAuth(req, res, next) {
  // 添加日志：检查认证状态
  console.log(`[EnsureAuth] Checking authentication. SessionID: ${req.sessionID}, Authenticated: ${req.isAuthenticated()}, Expires: ${req.session?.cookie?.expires}`);

  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: '未授权' });
}
