/**
 * OAuth路由模块
 */
import express from 'express';
import { OAuthController } from './controllers/OAuthController.js';

const router = express.Router();

// 创建OAuth控制器实例
const oauthController = new OAuthController();

// GitHub OAuth流程
router.get('/github', (req, res) => {
  oauthController.initiateAuth('github', req, res);
});

router.get('/github/callback', (req, res) => {
  oauthController.handleCallback('github', req, res);
});

// Google OAuth流程
router.get('/google', (req, res) => {
  oauthController.initiateAuth('google', req, res);
});

router.get('/google/callback', (req, res) => {
  oauthController.handleCallback('google', req, res);
});

// OAuth 2FA验证
router.post('/2fa/verify', (req, res) => {
  oauthController.handle2FAVerification(req, res);
});

// 临时token交换
router.post('/exchange-token', (req, res) => {
  oauthController.handleTokenExchange(req, res);
});

export default router;
