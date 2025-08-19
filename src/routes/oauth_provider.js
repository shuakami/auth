/**
 * OAuth 2.0 Provider 路由
 * 
 * 这个文件包含了 OAuth 2.0 服务器的核心端点，如 /authorize 和 /token。
 */
import express from 'express';
import { ensureAuth } from '../../../middlewares/authenticated.js';
import { AuthorizationServerService } from '../../services/oauth/AuthorizationServerService.js';
import { pool } from '../../../db/index.js';

const router = express.Router();
const authService = new AuthorizationServerService();

/**
 * GET /oauth/authorize
 * @description
 * OAuth 2.0 授权端点。
 * 验证客户端请求，检查用户登录状态，并将用户重定向到前端的同意授权页面。
 */
router.get('/authorize', ensureAuth, async (req, res) => {
  const { query, user } = req;

  // 1. 验证授权请求的参数 (client_id, redirect_uri, etc.)
  const { isValid, error, errorDescription, client, validatedScope } = await authService.validateAuthorizationRequest(query);

  if (!isValid) {
    // 如果验证失败，但我们可以安全地重定向回客户端
    if (query.redirect_uri && client) {
        const redirectUrl = new URL(query.redirect_uri);
        redirectUrl.searchParams.set('error', error);
        redirectUrl.searchParams.set('error_description', errorDescription);
        if(query.state) redirectUrl.searchParams.set('state', query.state);
        return res.redirect(redirectUrl.toString());
    }
    // 如果无法安全重定向，则直接返回错误
    return res.status(400).json({ error, error_description: errorDescription });
  }

  // 2. 将验证过的请求参数和客户端信息传递给前端同意页面
  const consentUrl = new URL('/oauth/authorize', process.env.CLIENT_URL || 'http://localhost:3000');
  consentUrl.searchParams.set('client_id', client.client_id);
  consentUrl.searchParams.set('client_name', client.name);
  consentUrl.searchParams.set('redirect_uri', query.redirect_uri);
  consentUrl.searchParams.set('scope', validatedScope);
  if (query.state) consentUrl.searchParams.set('state', query.state);
  if (query.code_challenge) consentUrl.searchParams.set('code_challenge', query.code_challenge);
  if (query.code_challenge_method) consentUrl.searchParams.set('code_challenge_method', query.code_challenge_method);
  
  res.redirect(consentUrl.toString());
});


/**
 * POST /oauth/consent
 * @description
 * 用户在前端同意授权后，由前端页面调用此接口。
 * 此接口生成授权码并重定向回客户端的 redirect_uri。
 */
router.post('/consent', ensureAuth, async (req, res) => {
    const { client_id, scope, redirect_uri, state, code_challenge, code_challenge_method, consent } = req.body;
    const { user } = req;
  
    // 再次验证 client_id 和 redirect_uri 防止篡改
    const client = await authService.getClientById(client_id);
    if (!client) {
      return res.status(400).json({ error: 'invalid_client' });
    }
    const registeredUris = JSON.parse(client.redirect_uris || '[]');
    if (!registeredUris.includes(redirect_uri)) {
      return res.status(400).json({ error: 'invalid_redirect_uri' });
    }
  
    const finalRedirectUrl = new URL(redirect_uri);
    if (state) finalRedirectUrl.searchParams.set('state', state);

    if (consent !== 'allow') {
      finalRedirectUrl.searchParams.set('error', 'access_denied');
      finalRedirectUrl.searchParams.set('error_description', 'The user denied the request.');
      return res.json({ redirect_uri: finalRedirectUrl.toString() });
    }
  
    // 生成授权码
    const code = await authService.generateAuthorizationCode(
      user.id,
      client_id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method
    );
  
    finalRedirectUrl.searchParams.set('code', code);
    res.json({ redirect_uri: finalRedirectUrl.toString() });
});

export default router;