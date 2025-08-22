/**
 * GitHub OAuth服务
 */
import axios from 'axios';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '../../../config/env.js';
import { OAuthServiceBase } from './OAuthServiceBase.js';

export class GitHubOAuthService extends OAuthServiceBase {
  constructor() {
    super({
      providerName: 'github',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      apiBaseUrl: 'https://api.github.com'
    });
  }

  /**
   * 获取GitHub授权参数
   * @returns {Object}
   */
  getAuthParams() {
    return {
      client_id: GITHUB_CLIENT_ID,
      scope: 'user:email'
    };
  }

  /**
   * 交换授权码获取GitHub访问令牌
   * @param {string} code 授权码
   * @returns {Promise<string>} 访问令牌
   */
  async exchangeCodeForToken(code) {
    const redirectUri = this.getRedirectUri();
    console.log(`[OAuth] GitHub 回调 redirect_uri:`, redirectUri);

    const response = await axios.post(this.config.tokenUrl, {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    }, { 
      headers: { Accept: 'application/json' } 
    });

    if (response.data.error) {
      console.error('[OAuth] GitHub access_token 获取失败:', response.data);
      throw new Error(`GitHub令牌获取失败: ${response.data.error}`);
    }

    return response.data.access_token;
  }

  /**
   * 获取GitHub用户信息
   * @param {string} accessToken 访问令牌
   * @returns {Promise<Object>} 用户信息
   */
  async getOAuthUserInfo(code, state) {
    try {
      // 1. 交换授权码获取访问令牌
      const accessToken = await this.exchangeCodeForToken(code);
      if (!accessToken) {
        throw new Error(`${this.providerName}授权失败`);
      }

      // 2. 获取用户信息
      const userInfo = await this.getUserInfo(accessToken);
      return this.normalizeUserInfo(userInfo);
    } catch (error) {
      console.error(`[OAuth] 获取 ${this.providerName} 用户信息失败:`, error);
      throw error;
    }
  }

  /**
   * 获取GitHub用户信息
   * @param {string} accessToken 访问令牌
   * @returns {Promise<Object>} GitHub用户信息
   */
  async getUserInfo(accessToken) {
    const headers = { Authorization: `token ${accessToken}` };

    // 并行获取用户基本信息和邮箱信息
    const [userResponse, emailsResponse] = await Promise.all([
      axios.get(`${this.config.apiBaseUrl}/user`, { headers }),
      axios.get(`${this.config.apiBaseUrl}/user/emails`, { headers })
    ]);

    return {
      user: userResponse.data,
      emails: emailsResponse.data
    };
  }

  /**
   * 标准化GitHub用户信息
   * @param {Object} rawUserInfo GitHub原始用户信息
   * @returns {Object} 标准化的用户信息
   */
  normalizeUserInfo(rawUserInfo) {
    const { user, emails } = rawUserInfo;
    const githubId = user.id;

    // 优先选择主要且已验证的邮箱
    let email = emails.find(e => e.primary && e.verified)?.email || 
                emails.find(e => e.verified)?.email || 
                emails[0]?.email;

    // 如果没有邮箱，使用GitHub的noreply邮箱
    if (!email) {
      email = `${githubId}@users.noreply.github.com`;
    }

    return {
      id: githubId,
      email,
      username: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      provider: 'github',
      providerAccountId: String(githubId),
      raw: user
    };
  }
}