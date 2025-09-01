/**
 * 统一认证路由出口。
 */
import express from 'express';

import userRouter       from './auth/user.js';
import sessionRouter    from './auth/session.js';
import passwordRouter   from './auth/password.js';
import totpRouter       from './auth/totp.js';
import backupRouter     from './auth/backupCodes.js';
import webauthnRouter   from './auth/webauthn.js';
import oauthDocsRouter  from './auth/oauthDocs.js';
import oauthRouter from '../auth/oauth.js';

const router = express.Router();

router.use(userRouter);
router.use(sessionRouter);
router.use(passwordRouter);
router.use(totpRouter);
router.use(backupRouter);
router.use(webauthnRouter);
router.use(oauthDocsRouter);
router.use(oauthRouter);

export default router;
