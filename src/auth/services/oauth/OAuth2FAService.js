/**
 * OAuth 2FA服务 - 处理OAuth登录中的2FA流程
 */
import { signAccessToken } from '../../jwt.js';
import { TokenService } from '../TokenService.js';
import { PUBLIC_BASE_URL } from '../../../config/env.js';

export class OAuth2FAService {
  constructor() {
    this.tokenService = new TokenService();
  }

  /**
   * 检查用户是否需要2FA验证
   * @param {Object} user 用户对象
   * @returns {boolean}
   */
  requires2FA(user) {
    return !!user.totp_enabled;
  }

  /**
   * 生成2FA挑战临时令牌
   * @param {Object} user 用户对象
   * @param {string} provider OAuth提供商
   * @returns {string} 临时令牌
   */
  generateChallenge2FAToken(user, provider) {
    console.log(`[OAuth-2FA] 为用户 ${user.id} 生成${provider} 2FA挑战令牌`);
    
    return signAccessToken({ 
      uid: user.id, 
      type: '2fa_challenge', 
      provider 
    });
  }

  /**
   * 处理需要2FA的OAuth用户
   * @param {Object} user 用户对象
   * @param {string} provider OAuth提供商
   * @returns {string} 重定向URL
   */
  handle2FARequired(user, provider) {
    const temp2FAToken = this.generateChallenge2FAToken(user, provider);
    const redirectUrl = `${PUBLIC_BASE_URL}/2fa-required?token=${temp2FAToken}`;
    
    console.log(`[OAuth-2FA] 重定向用户 ${user.id} 到2FA验证页面`);
    return redirectUrl;
  }

  /**
   * 处理OAuth登录成功（无需2FA）
   * @param {Object} user 用户对象
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @param {string} provider OAuth提供商
   * @returns {string} 重定向URL
   */
  async handleDirectLogin(user, req, res, provider) {
    console.log(`[OAuth] 用户 ${user.id} ${provider}登录成功，无需2FA`);
    
    // 不在弹窗中设置cookie，而是生成临时token传递给前端
    const tempToken = this.generateChallenge2FAToken(user, `${provider}_success`);
    
    // 将临时token作为URL参数传递给前端回调页面
    const callbackUrl = new URL(`${PUBLIC_BASE_URL}/login/${provider}-callback`);
    callbackUrl.searchParams.set('temp_token', tempToken);
    
    return callbackUrl.toString();
  }

  /**
   * 验证2FA挑战令牌
   * @param {string} token 2FA挑战令牌
   * @returns {Object|null} 令牌payload或null
   */
  verify2FAToken(token) {
    try {
      const { verifyAccessToken } = require('../../jwt.js');
      const payload = verifyAccessToken(token);
      
      if (!payload || !payload.uid || payload.type !== '2fa_challenge') {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('[OAuth-2FA] 2FA令牌验证失败:', error);
      return null;
    }
  }

  /**
   * 完成2FA验证后的OAuth登录
   * @param {Object} user 用户对象
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @returns {Promise<void>}
   */
  async complete2FALogin(user, req, res) {
    console.log(`[OAuth-2FA] 用户 ${user.id} 完成2FA验证，签发正式令牌`);
    
    // 生成并设置正式令牌
    const tokenInfo = await this.tokenService.generateAndSetTokens(user, req, res);
    
    return {
      ok: true,
      tokenType: tokenInfo.tokenType,
      expiresIn: tokenInfo.expiresIn
    };
  }
}