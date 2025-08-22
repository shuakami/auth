/**
 * OAuth 2.0 Provider 路由
 * 
 * 这个文件包含了 OAuth 2.0 服务器的核心端点，如 /authorize 和 /token。
 */
import express from 'express';
import { ensureAuth } from '../middlewares/authenticated.js';
import { AuthorizationServerService } from '../auth/services/oauth/AuthorizationServerService.js';
import { pool } from '../db/index.js';
import { PUBLIC_BASE_URL } from '../config/env.js';
import jose from 'node-jose';
import { publicKey } from '../auth/jwt.js';

const router = express.Router();
const discoveryRouter = express.Router(); // 为 OIDC Discovery 创建一个新的 router
const authService = new AuthorizationServerService();

/**
 * GET /.well-known/openid-configuration
 * @description
 * Gibt das OIDC Discovery-Dokument für Frontend-Anwendungen zurück.
 * Dieses Dokument enthält Metadaten über den OIDC-Provider.
 */
discoveryRouter.get('/.well-known/openid-configuration', (req, res) => {
  const issuer = 'https://auth.sdjz.wiki'; // 使用硬编码的 URL
  const configuration = {
    issuer: issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    jwks_uri: `${issuer}/api/oauth/jwks.json`,
    scopes_supported: [
      'openid',
      'profile',
      'email',
      'offline_access'
    ],
    response_types_supported: [
      'code'
    ],
    grant_types_supported: [
      'authorization_code',
      'refresh_token'
    ],
    subject_types_supported: [
      'public'
    ],
    id_token_signing_alg_values_supported: [
      'RS256'
    ],
    token_endpoint_auth_methods_supported: [
      'client_secret_post'
    ],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'email',
      'username'
    ]
  };
  res.json(configuration);
});

/**
 * GET /jwks.json
 * @description
 * Gibt den JSON Web Key Set (JWKS) zurück, der die öffentlichen Schlüssel
 * enthält, die zum Überprüfen der ID-Token-Signaturen verwendet werden.
 */
router.get('/jwks.json', async (req, res) => {
  try {
    const keystore = jose.JWK.createKeyStore();
    await keystore.add(publicKey, 'pem', { alg: 'RS256', use: 'sig', kid: 'sdjz-auth-rs256-main' });

    res.json(keystore.toJSON());
  } catch (error) {
    console.error('Error generating JWKS:', error);
    res.status(500).json({ error: 'internal_server_error', error_description: 'Could not generate JWKS' });
  }
});

/**
 * GET /oauth/authorize
 * @description
 * OAuth 2.0 授权端点。
 * 验证客户端请求，检查用户登录状态，并将用户重定向到前端的同意授权页面。
 */
router.get('/authorize', async (req, res) => {
  const { query } = req;
  


  // 1. 验证授权请求的参数 (client_id, redirect_uri, etc.)
  const { isValid, error, errorDescription, client, validatedScope, validatedRedirectUri, validatedResponseType } = await authService.validateAuthorizationRequest(query);

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

  // 2. 检查用户登录状态
  const accessToken = req.cookies.accessToken || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  
  if (!accessToken) {
    // 用户未登录，重定向到登录页面，登录后自动回到授权页面
    const loginUrl = new URL('/login', PUBLIC_BASE_URL);
    // 将当前的授权请求参数编码并传递给登录页面
    const returnUrl = `/api/oauth/authorize?${new URLSearchParams(query).toString()}`;
    loginUrl.searchParams.set('returnUrl', returnUrl);
    return res.redirect(loginUrl.toString());
  }

  // 3. 验证访问令牌
  try {
    const { verifyAccessToken } = await import('../auth/jwt.js');
    const payload = verifyAccessToken(accessToken);
    
    if (!payload || !payload.uid) {
      // 令牌无效，重定向到登录页面
      const loginUrl = new URL('/login', PUBLIC_BASE_URL);
      const returnUrl = `/api/oauth/authorize?${new URLSearchParams(query).toString()}`;
      loginUrl.searchParams.set('returnUrl', returnUrl);
      return res.redirect(loginUrl.toString());
    }

    // 4. 用户已登录且令牌有效，将验证过的请求参数传递给前端同意页面
    
    const consentUrl = new URL('/oauth/authorize', PUBLIC_BASE_URL);
    consentUrl.searchParams.set('client_id', client.client_id);
    consentUrl.searchParams.set('client_name', client.name);
    
    // 使用验证过的参数
    consentUrl.searchParams.set('redirect_uri', validatedRedirectUri);
    consentUrl.searchParams.set('response_type', validatedResponseType);
    
    consentUrl.searchParams.set('scope', validatedScope);
    if (query.state && query.state !== 'undefined') consentUrl.searchParams.set('state', query.state);
    if (query.code_challenge && query.code_challenge !== 'undefined') consentUrl.searchParams.set('code_challenge', query.code_challenge);
    if (query.code_challenge_method && query.code_challenge_method !== 'undefined') consentUrl.searchParams.set('code_challenge_method', query.code_challenge_method);
    
    res.redirect(consentUrl.toString());

  } catch (error) {
    console.error('[OAuth] Token verification failed:', error);
    // 令牌验证失败，重定向到登录页面
    const loginUrl = new URL('/login', PUBLIC_BASE_URL);
    const returnUrl = `/api/oauth/authorize?${new URLSearchParams(query).toString()}`;
    loginUrl.searchParams.set('returnUrl', returnUrl);
    return res.redirect(loginUrl.toString());
  }
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


/**
 * POST /oauth/token
 * @description
 * OAuth 2.0 令牌端点。
 * 用于交换授权码获取访问令牌，或使用刷新令牌获取新的访问令牌。
 */
router.post('/token', async (req, res) => {
  try {
    const { 
      grant_type, 
      code, 
      redirect_uri, 
      client_id, 
      client_secret, 
      code_verifier,
      refresh_token 
    } = req.body;

    if (!grant_type) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        error_description: 'Missing grant_type parameter' 
      });
    }

    if (grant_type === 'authorization_code') {
      // 授权码交换流程
      if (!code || !client_id || !redirect_uri) {
        return res.status(400).json({ 
          error: 'invalid_request', 
          error_description: 'Missing required parameters for authorization_code grant' 
        });
      }

      const tokenResponse = await authService.exchangeAuthorizationCode(
        code, client_id, client_secret, redirect_uri, code_verifier
      );
      
      return res.json(tokenResponse);

    } else if (grant_type === 'refresh_token') {
      // 刷新令牌流程
      if (!refresh_token || !client_id) {
        return res.status(400).json({ 
          error: 'invalid_request', 
          error_description: 'Missing required parameters for refresh_token grant' 
        });
      }

      const tokenResponse = await authService.refreshAccessToken(
        refresh_token, client_id, client_secret
      );
      
      return res.json(tokenResponse);

    } else {
      return res.status(400).json({ 
        error: 'unsupported_grant_type', 
        error_description: `Grant type ${grant_type} is not supported` 
      });
    }

  } catch (error) {
    console.error('[OAuth] Token exchange error:', error);
    
    // 处理特定的OAuth错误
    if (error.message.startsWith('invalid_grant:') || 
        error.message.startsWith('invalid_client:') || 
        error.message.startsWith('invalid_request:')) {
      const [errorType, errorDescription] = error.message.split(': ');
      return res.status(400).json({ 
        error: errorType, 
        error_description: errorDescription 
      });
    }
    
    return res.status(500).json({ 
      error: 'server_error', 
      error_description: 'Internal server error' 
    });
  }
});


/**
 * GET /oauth/userinfo
 * @description
 * OAuth 2.0 用户信息端点。
 * 使用Bearer访问令牌获取用户信息。
 */
router.get('/userinfo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'invalid_token', 
        error_description: 'Missing or invalid Authorization header' 
      });
    }

    const accessToken = authHeader.substring(7); // 移除 "Bearer " 前缀
    const userInfo = await authService.getUserInfo(accessToken);
    
    return res.json(userInfo);

  } catch (error) {
    console.error('[OAuth] UserInfo error:', error);
    
    if (error.message.startsWith('invalid_token:')) {
      return res.status(401).json({ 
        error: 'invalid_token', 
        error_description: error.message.substring(14) 
      });
    }
    
    return res.status(500).json({ 
      error: 'server_error', 
      error_description: 'Internal server error' 
    });
  }
});

export { router as default, discoveryRouter };