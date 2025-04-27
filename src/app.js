import express, { json, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './middlewares/session.js';
import authRouter from './routes/auth.js';
import { initOAuth } from './auth/oauth.js';
import { setupDocs } from './middlewares/docs.js';

const app = express();

// 信任 Vercel 等反向代理设置的 X-Forwarded-* 头
app.set('trust proxy', 1);

/* 基础中间件 */
app.use(json());
app.use(cookieParser());

// 打印收到的原始 Cookies (在 Session 中间件处理之前)
app.use((req, res, next) => {
  console.log(`[RawCookies] Request path: ${req.path}, Cookies received:`, req.cookies);
  next();
});

app.use(sessionMiddleware());

// 全局 Session 状态日志中间件 (在 sessionMiddleware 之后)
app.use((req, res, next) => {
  if (req.session) {
    const expires = req.session.cookie?.expires;
    console.log(`[SessionCheck] Request path: ${req.path}, SessionID: ${req.sessionID}, Expires: ${expires ? expires.toISOString() : 'N/A'}, Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A (passport not initialized yet?)'}`);
  }
  next();
});

/* 静态文件 */
app.use(expressStatic('public'));

/* 开发环境 API 文档 */
setupDocs(app);

/* OAuth */
initOAuth(app);

/* 业务 API 路由 */
app.use('/api', authRouter);

/* 全局错误处理 */
app.use((err, _req, res, _next) => {
  console.error('未处理错误:', err.stack || err);
  res.status(err.status || 500).json({ error: err.message || '内部服务器错误' });
});

export default app;
