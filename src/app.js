import express, { json } from 'express';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './middlewares/session.js';
import authRouter from './routes/auth.js';
import { initOAuth } from './auth/oauth.js';
import { init as initDb } from './db/index.js';
import { setupDocs } from './middlewares/docs.js';

const app = express();
app.use(json());
app.use(cookieParser());
app.use(sessionMiddleware());

// 开发环境下设置API文档
setupDocs(app);

initOAuth(app);
app.use(authRouter);

// DB tables
// initDb().catch(console.error);

export default app;
