import crypto from 'crypto';

/**
 * CSRF Token 生成中间件 (双重提交Cookie模式)
 * 如果会话中不存在CSRF密钥，则生成一个，并设置
 * 一个非httpOnly的cookie (XSRF-TOKEN) 来存储这个密钥。
 */
export function generateCsrf(req, res, next) {
  // 确保会话中间件已激活
  if (!req.session) {
    console.error('CSRF保护: 会话中间件未配置!');
    return next(new Error('CSRF保护必须配置会话中间件。'));
  }

  // 仅为新会话或缺少密钥的会话生成
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
    console.log(`为会话 ${req.sessionID} 生成了新的 CSRF Secret`);
  }

  // 将 CSRF Secret 设置到 XSRF-TOKEN cookie 中
  res.cookie('XSRF-TOKEN', req.session.csrfSecret, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production', // 生产环境强制 HTTPS
    sameSite: 'lax',  // 防止跨站请求
    path: '/',        // 确保在所有路径可用
    maxAge: req.session.cookie?.maxAge || 24 * 60 * 60 * 1000
  });

  next();
}

/**
 * CSRF Token 验证中间件 (双重提交Cookie模式)
 * 验证X-XSRF-TOKEN头中的token是否与
 * 会话中存储的csrfSecret匹配。
 */
export function verifyCsrf(req, res, next) {
  // 确保会话和密钥存在
  if (!req.session || !req.session.csrfSecret) {
    console.warn('CSRF验证失败: 会话中缺少CSRF密钥，会话ID:', req.sessionID);
    return res.status(403).json({ error: '会话无效或已过期，请刷新后重试。' });
  }

  const secret = req.session.csrfSecret;
  // 头名称不区分大小写，但使用一致的名称
  const tokenFromHeader = req.headers['x-xsrf-token'];

  // 检查头中是否存在token
  if (!tokenFromHeader) {
    console.warn('CSRF验证失败: 请求头中缺少X-XSRF-TOKEN，会话ID:', req.sessionID);
    return res.status(403).json({ error: '请求头中缺少必需的CSRF token。' });
  }

  // 比较会话密钥与头中的token
  if (secret !== tokenFromHeader) {
    console.warn(`CSRF验证失败: 会话ID ${req.sessionID} 的token不匹配。头: ${tokenFromHeader}, 期望: ${secret}`);
    return res.status(403).json({ error: '无效的CSRF token。' });
  }

  // 如果token匹配，继续处理
  next();
}