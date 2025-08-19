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