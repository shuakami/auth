import express, { json, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './middlewares/session.js';
import authRouter from './routes/auth.js';
import { initOAuth } from './auth/oauth.js';
import { setupDocs } from './middlewares/docs.js';

const app = express();

/* 基础中间件 */
app.use(json());
app.use(cookieParser());
app.use(sessionMiddleware());

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
