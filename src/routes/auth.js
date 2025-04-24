/**
 * 统一认证路由出口。
 */
import express from 'express';

import userRouter       from './auth/user.js';
import sessionRouter    from './auth/session.js';
import passwordRouter   from './auth/password.js';
import totpRouter       from './auth/totp.js';
import backupRouter     from './auth/backupCodes.js';
import oauthDocsRouter  from './auth/oauthDocs.js';

const router = express.Router();

router.use(userRouter);
router.use(sessionRouter);
router.use(passwordRouter);
router.use(totpRouter);
router.use(backupRouter);
router.use(oauthDocsRouter);

export default router;
