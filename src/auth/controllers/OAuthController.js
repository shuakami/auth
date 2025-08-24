/**
 * OAuth控制器 - 协调OAuth登录流程
 */
import { GitHubOAuthService } from '../services/oauth/GitHubOAuthService.js';
import { GoogleOAuthService } from '../services/oauth/GoogleOAuthService.js';
import { UserBindingService } from '../services/oauth/UserBindingService.js';
import { OAuth2FAService } from '../services/oauth/OAuth2FAService.js';
import { AuthenticationService } from '../services/AuthenticationService.js';
import * as User from '../../services/userService.js';

export class OAuthController {
  constructor() {
    this.oauthServices = {
      github: new GitHubOAuthService(),
      google: new GoogleOAuthService()
    };
    this.userBindingService = new UserBindingService();
    this.oauth2FAService = new OAuth2FAService();
    this.authService = new AuthenticationService();
  }

  /**
   * 发起OAuth授权
   * @param {string} provider OAuth提供商
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   */
  async initiateAuth(provider, req, res) {
    try {
      const oauthService = this._getOAuthService(provider);
      const { returnUrl } = req.query;
      const authUrl = oauthService.generateAuthUrl({ returnUrl });
      
      console.log(`[OAuth] 发起${provider}授权，重定向到:`, authUrl);
      res.redirect(authUrl);
      
    } catch (error) {
      console.error(`[OAuth] ${provider}授权发起失败:`, error);
      res.status(500).send(`${provider}授权发起失败`);
    }
  }

  /**
   * 处理OAuth回调
   * @param {string} provider OAuth提供商
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   */
  async handleCallback(provider, req, res) {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('缺少code');
    }

    try {
      console.log(`[OAuth] 处理${provider}回调，code:`, code.substring(0, 10) + '...');

      // 1. 获取用户信息
      const oauthService = this._getOAuthService(provider);
      const normalizedUserInfo = await oauthService.getOAuthUserInfo(code, state);

      // 2. 处理用户绑定
      const user = await this.userBindingService.handleUserBinding(normalizedUserInfo);

      // 3. 检查2FA状态
      if (this.oauth2FAService.requires2FA(user)) {
        const redirectUrl = this.oauth2FAService.handle2FARequired(user, provider, state);
        return res.redirect(redirectUrl);
      }

      // 4. 直接登录（无需2FA）
      const redirectUrl = await this.oauth2FAService.handleDirectLogin(user, req, res, provider, state);
      return res.redirect(redirectUrl);

    } catch (error) {
      console.error(`[OAuth] ${provider}回调处理失败:`, error);
      res.status(500).send(`${provider}OAuth回调失败`);
    }
  }

  /**
   * 处理2FA验证
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   */
  async handle2FAVerification(req, res) {
    try {
      const { token, totp, backupCode } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: '缺少2FA临时Token' });
      }

      // 1. 验证2FA挑战令牌
      const payload = this.oauth2FAService.verify2FAToken(token);
      if (!payload) {
        return res.status(401).json({ error: '无效或过期的2FA临时Token' });
      }

      // 2. 获取用户信息
      const user = await User.findById(payload.uid);
      if (!user || !user.totp_enabled) {
        return res.status(401).json({ error: '用户未开启2FA' });
      }

      // 3. 验证TOTP或备份码
      let verificationResult;
      if (totp) {
        verificationResult = await this.authService.verifyTotpToken(user, totp);
      } else if (backupCode) {
        verificationResult = await this.authService.verifyBackupCode(user.id, backupCode);
      } else {
        return res.status(400).json({ error: '缺少TOTP令牌或备份码' });
      }

      if (!verificationResult.success) {
        return res.status(401).json({ error: '2FA验证码或备份码无效' });
      }

      // 4. 完成登录
      const result = await this.oauth2FAService.complete2FALogin(user, req, res);
      res.json(result);

    } catch (error) {
      console.error('[OAuth-2FA] 2FA验证失败:', error);
      res.status(500).json({ error: '2FA验证失败' });
    }
  }

  /**
   * 获取OAuth服务实例
   * @param {string} provider 提供商名称
   * @returns {OAuthServiceBase}
   * @private
   */
  _getOAuthService(provider) {
    const service = this.oauthServices[provider];
    if (!service) {
      throw new Error(`不支持的OAuth提供商: ${provider}`);
    }
    return service;
  }

  /**
   * 处理临时token交换
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   */
  async handleTokenExchange(req, res) {
    try {
      const { tempToken } = req.body;
      
      if (!tempToken) {
        return res.status(400).json({ error: '缺少临时token' });
      }

      // 1. 验证临时token
      const payload = this.oauth2FAService.verify2FAToken(tempToken);
      if (!payload) {
        return res.status(401).json({ error: '无效或过期的临时token' });
      }

      // 2. 检查token类型
      if (!payload.provider || !payload.provider.endsWith('_success')) {
        return res.status(401).json({ error: '无效的token类型' });
      }

      // 3. 获取用户信息
      const User = await import('../../services/userService.js');
      const user = await User.findById(payload.uid);
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }

      // 4. 生成并设置正式的cookie
      const tokenInfo = await this.oauth2FAService.tokenService.generateAndSetTokens(user, req, res);
      
      console.log(`[OAuth] 临时token交换成功，用户 ${user.id} 已登录`);
      
      const { password_hash, ...rest } = user;
      
      res.json({
        ok: true,
        tokenType: tokenInfo.tokenType,
        expiresIn: tokenInfo.expiresIn,
        returnUrl: payload.returnUrl || null,
        user: { ...rest, has_password: !!password_hash },
      });

    } catch (error) {
      console.error('[OAuth] 临时token交换失败:', error);
      res.status(500).json({ error: '临时token交换失败' });
    }
  }

  /**
   * 获取支持的OAuth提供商列表
   * @returns {string[]}
   */
  getSupportedProviders() {
    return Object.keys(this.oauthServices);
  }
}