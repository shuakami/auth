export function ensureAuth(req, res, next) {
  if (req.isAuthenticated?.() && req.user) return next();
  res.status(401).json({ error: 'unauthenticated' });
}
