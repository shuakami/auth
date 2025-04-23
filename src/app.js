import express, { json, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './middlewares/session.js';
import { generateCsrf } from './middlewares/csrf.js';
import authRouter from './routes/auth.js';
import { initOAuth } from './auth/oauth.js';
import { setupDocs } from './middlewares/docs.js';

const app = express();

// 解析JSON请求体
app.use(json());

// 解析Cookie
app.use(cookieParser());

// 会话中间件
app.use(sessionMiddleware());

// 静态文件服务
app.use(expressStatic('public'));

// 应用CSRF保护
app.use(generateCsrf);

// 开发环境下设置API文档
setupDocs(app);

// 初始化OAuth配置
initOAuth(app);

// 认证路由
app.use(authRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error("未处理错误:", err.stack || err);
  res.status(err.status || 500).json({ error: err.message || '内部服务器错误' });
});

export default app;
