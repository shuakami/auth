/**
 * OAuth 2.0 授权服务器核心服务
 *
 * 这个服务实现了 OAuth 2.0 规范的核心逻辑，包括：
 * 1. 处理和验证授权请求 (/authorize)
 * 2. 处理用户同意和授权码的生成
 * 3. 处理令牌交换请求 (/token)
 */
import { pool } from '../../../db/index.js';
import { URL } from 'url';
import crypto from 'crypto';
import { signAccessToken, signIdToken } from '../../jwt.js';

const AUTHORIZATION_CODE_LIFETIME = 600; // 10 minutes in seconds

export class AuthorizationServerService {

  /**
   * 验证传入的授权请求参数
   * @param {object} query - 来自于 /authorize 端点的查询参数
   * @returns {Promise<{isValid: boolean, error: string|null, errorDescription: string|null, client: object|null, scope: string}>}
   */
  async validateAuthorizationRequest(query) {
    const { response_type, client_id, redirect_uri, scope, state } = query;

    if (!response_type || response_type !== 'code') {
      return { isValid: false, error: 'invalid_request', errorDescription: 'The "response_type" parameter must be "code".' };
    }

    if (!client_id) {
      return { isValid: false, error: 'invalid_request', errorDescription: 'Missing required parameter: "client_id".' };
    }

    if (!redirect_uri) {
      return { isValid: false, error: 'invalid_request', errorDescription: 'Missing required parameter: "redirect_uri".' };
    }
    
    // 1. 验证客户端是否存在
    const client = await this.getClientById(client_id);
    if (!client) {
      return { isValid: false, error: 'unauthorized_client', errorDescription: 'Invalid "client_id".' };
    }

    // 2. 验证重定向 URI 是否匹配
    // The provided redirect_uri must exactly match one of the registered URIs.
    const registeredUris = JSON.parse(client.redirect_uris || '[]');
    if (!registeredUris.includes(redirect_uri)) {
      return { isValid: false, error: 'invalid_request', errorDescription: 'The "redirect_uri" is not registered for this client.' };
    }
    
    // 3. 验证并处理 Scope
    const requestedScopes = scope ? scope.split(' ') : [];
    const registeredScopes = JSON.parse(client.scopes || '[]');
    const validScopes = requestedScopes.filter(s => registeredScopes.includes(s));
    
    if (!validScopes.includes('openid')) {
      // OIDC requires the 'openid' scope. For now, we enforce it.
      // return { isValid: false, error: 'invalid_scope', errorDescription: 'The "openid" scope is required.' };
    }

    return { 
      isValid: true, 
      error: null, 
      errorDescription: null,
      client,
      validatedScope: validScopes.join(' ')
    };
  }

  /**
   * 在用户同意授权后，生成并存储授权码
   * @param {string} userId - 已授权的用户 ID
   * @param {string} clientId - 客户端 ID
   * @param {string} redirectUri - 重定向 URI
   * @param {string} scope - 最终授权的范围
   * @param {string} codeChallenge - PKCE code challenge
   * @param {string} codeChallengeMethod - PKCE code challenge method
   * @returns {Promise<string>} 生成的授权码
   */
  async generateAuthorizationCode(userId, clientId, redirectUri, scope, codeChallenge, codeChallengeMethod) {
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_LIFETIME * 1000);

    await pool.query(
      `INSERT INTO oauth_authorization_codes 
        (code, user_id, client_id, redirect_uri, scopes, expires_at, code_challenge, code_challenge_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [code, userId, clientId, redirectUri, scope, expiresAt, codeChallenge, codeChallengeMethod]
    );

    return code;
  }

  /**
   * 验证并消费授权码，返回令牌
   * @param {string} code - 授权码
   * @param {string} clientId - 客户端ID
   * @param {string} clientSecret - 客户端密钥
   * @param {string} redirectUri - 重定向URI
   * @param {string} codeVerifier - PKCE验证码
   * @returns {Promise<{access_token: string, refresh_token: string, id_token: string, token_type: string, expires_in: number}>}
   */
  async exchangeAuthorizationCode(code, clientId, clientSecret, redirectUri, codeVerifier) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 验证并获取授权码
      const { rows: authCodeRows } = await client.query(
        'SELECT * FROM oauth_authorization_codes WHERE code = $1 AND used = FALSE AND expires_at > NOW()',
        [code]
      );
      
      if (authCodeRows.length === 0) {
        throw new Error('invalid_grant: 授权码无效或已过期');
      }
      
      const authCode = authCodeRows[0];
      
      // 2. 验证客户端信息
      if (authCode.client_id !== clientId) {
        throw new Error('invalid_client: 客户端ID不匹配');
      }
      
      if (authCode.redirect_uri !== redirectUri) {
        throw new Error('invalid_grant: 重定向URI不匹配');
      }
      
      // 3. 验证客户端密钥（仅对confidential clients）
      const clientApp = await this.getClientById(clientId);
      if (!clientApp) {
        throw new Error('invalid_client: 客户端不存在');
      }
      
      if (clientApp.app_type === 'web' && clientApp.client_secret !== clientSecret) {
        throw new Error('invalid_client: 客户端密钥错误');
      }
      
      // 4. 验证PKCE（如果使用）
      if (authCode.code_challenge) {
        if (!codeVerifier) {
          throw new Error('invalid_request: 缺少code_verifier');
        }
        
        const crypto = await import('crypto');
        const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        
        if (challenge !== authCode.code_challenge) {
          throw new Error('invalid_grant: PKCE验证失败');
        }
      }
      
      // 5. 标记授权码为已使用
      await client.query(
        'UPDATE oauth_authorization_codes SET used = TRUE WHERE code = $1',
        [code]
      );
      
      // 6. 生成访问令牌
      const tokenPayload = {
        uid: authCode.user_id,
        client_id: clientId,
        scope: authCode.scopes,
        type: 'access_token'
      };
      
      const accessToken = signAccessToken(tokenPayload, '1h'); // 1小时有效期
      
      // 7. 生成ID令牌（OIDC）
      const { rows: userRows } = await client.query(
        'SELECT id, email, username FROM users WHERE id = $1',
        [authCode.user_id]
      );
      
      const user = userRows[0];
      const idTokenPayload = {
        sub: user.id,
        aud: clientId,
        email: user.email,
        username: user.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      const idToken = signIdToken(idTokenPayload);
      
      // 8. 生成refresh token (可选，基于scope)
      let refreshToken = null;
      if (authCode.scopes.includes('offline_access')) {
        const { createRefreshToken } = await import('../../../services/refreshTokenService.js');
        const result = await createRefreshToken(authCode.user_id, 'OAuth Client', clientId);
        refreshToken = result.token;
      }
      
      await client.query('COMMIT');
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        id_token: idToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: authCode.scopes
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 使用访问令牌获取用户信息
   * @param {string} accessToken - 访问令牌
   * @returns {Promise<object>} 用户信息
   */
  async getUserInfo(accessToken) {
    try {
      const { verifyAccessToken } = await import('../../jwt.js');
      const payload = verifyAccessToken(accessToken);
      
      if (!payload || payload.type !== 'access_token') {
        throw new Error('invalid_token: 访问令牌无效');
      }
      
      const { rows } = await pool.query(
        'SELECT id, email, username FROM users WHERE id = $1',
        [payload.uid]
      );
      
      if (rows.length === 0) {
        throw new Error('invalid_token: 用户不存在');
      }
      
      const user = rows[0];
      return {
        sub: user.id,
        email: user.email,
        username: user.username,
        email_verified: true // 假设所有email都已验证
      };
      
    } catch (error) {
      throw new Error('invalid_token: ' + error.message);
    }
  }

  /**
   * 从数据库中获取客户端应用信息
   * @param {string} clientId
   * @returns {Promise<object|null>}
   */
  async getClientById(clientId) {
    const { rows } = await pool.query(
      'SELECT * FROM oauth_applications WHERE client_id = $1 AND is_active = TRUE',
      [clientId]
    );
    return rows[0] || null;
  }
}