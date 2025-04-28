import express, { json, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.js';
import { setupDocs } from './middlewares/docs.js';

const app = express();

// 信任 Vercel 等反向代理设置的 X-Forwarded-* 头
app.set('trust proxy', 1);

/* 全局中间件 */
app.use(cookieParser());
app.use(json());

// 配置 CORS 中间件
app.use(cors({
  origin: 'http://localhost:3001', // 允许的前端来源，根据你的实际情况修改
  credentials: true // 允许携带 Cookie
}));

/* 静态文件 */
app.use(expressStatic('public'));

/* 开发环境 API 文档 */
setupDocs(app);

/* 业务 API 路由 */
app.use('/api', authRouter);

/* 全局错误处理 */
app.use((err, _req, res, _next) => {
  console.error('未处理错误:', err.stack || err);
  res.status(err.status || 500).json({ error: err.message || '内部服务器错误' });
});

export default app;
