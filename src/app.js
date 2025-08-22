import express, { json, static as expressStatic } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from './routes/auth.js';
import adminUsersRouter from './routes/admin/users.js';
import adminRolesRouter from './routes/admin/roles.js';
import oauthAppsRouter from './routes/oauth/apps.js';
import oauthProviderRouter, { discoveryRouter } from './routes/oauth_provider.js'; // 导入新的路由
import helmet from 'helmet';
import session from 'express-session';
import { NODE_ENV, SESSION_SECRET } from './config/env.js';
import { pool } from './db/index.js';
import { setupDocs } from './middlewares/docs.js';
import { ensureAuth } from './middlewares/authenticated.js';

const app = express();

// 信任 Vercel 等反向代理设置的 X-Forwarded-* 头
app.set('trust proxy', 1);

/* 全局中间件 */
app.use(cookieParser());
app.use(json());
app.use(express.urlencoded({ extended: true })); // 添加表单数据解析支持
app.use(cors({
  origin: /^https:\/\/[a-zA-Z0-9.-]+\.sdjz\.wiki$/,
  credentials: true
}));

// 会话中间件配置
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: NODE_ENV === 'production', // 在生产环境中应为 true
    httpOnly: true,
    maxAge: 1000 * 60 * 15 // 15 分钟
  }
}));

/* 静态文件 */
app.use(expressStatic('public'));

/* 开发环境 API 文档 */
setupDocs(app);

/* 业务 API 路由 */
app.use('/api', authRouter);

/* 管理 API 路由 */
app.use('/api/admin/users', ensureAuth, adminUsersRouter);
app.use('/api/admin/roles', ensureAuth, adminRolesRouter);

/* OAuth API 路由 */
app.use('/api/oauth/apps', ensureAuth, oauthAppsRouter);
app.use('/api/oauth', oauthProviderRouter); // 保持现有的OAuth路由

// 将 OIDC Discovery 端点直接挂载在根目录下
app.use('/', discoveryRouter);

/* 全局错误处理 */
app.use((err, _req, res, _next) => {
  console.error('未处理错误:', err.stack || err);
  res.status(err.status || 500).json({ error: err.message || '内部服务器错误' });
});

export default app;
