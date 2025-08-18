import rateLimit from 'express-rate-limit';

// 为认证相关路由创建速率限制器
// 每分钟最多允许来自同一 IP 的 10 次请求
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10, // 限制每个 IP 在 `windowMs` 内最多 10 个请求
  standardHeaders: true, // 返回符合 RFC 6585 的 RateLimit-* 头
  legacyHeaders: false, // 禁用旧的 X-RateLimit-* 头
  message: { error: 'Too many requests, please try again after a minute.' }, // 超限消息
});