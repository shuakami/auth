/**
 * Google OAuth服务
 */
import axios from 'axios';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../../../config/env.js';
import { OAuthServiceBase } from './OAuthServiceBase.js';

export class GoogleOAuthService extends OAuthServiceBase {
  constructor() {
    super({
      providerName: 'google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      apiBaseUrl: 'https://www.googleapis.com'
    });
  }

  /**
   * 获取Google授权参数
   * @returns {Object}
   */
  getAuthParams() {
    return {
      client_id: GOOGLE_CLIENT_ID,
      response_type: 'code',
      scope: 'profile email'
    };
  }

  /**
   * 交换授权码获取Google访问令牌
   * @param {string} code 授权码
   * @returns {Promise<string>} 访问令牌
   */
  async exchangeCodeForToken(code) {
    const response = await axios.post(this.config.tokenUrl, {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.getRedirectUri()
    });

    if (!response.data.access_token) {
      throw new Error('Google令牌获取失败');
    }

    return response.data.access_token;
  }

  /**
   * 获取Google用户信息
   * @param {string} accessToken 访问令牌
   * @returns {Promise<Object>} Google用户信息
   */
  async getUserInfo(accessToken) {
    const response = await axios.get(
      `${this.config.apiBaseUrl}/oauth2/v2/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return response.data;
  }

  /**
   * 标准化Google用户信息
   * @param {Object} rawUserInfo Google原始用户信息
   * @returns {Object} 标准化的用户信息
   */
  normalizeUserInfo(rawUserInfo) {
    const googleId = rawUserInfo.id;
    let email = rawUserInfo.email;

    // 如果没有邮箱，使用Google的noreply邮箱
    if (!email) {
      email = `${googleId}@users.noreply.google.com`;
    }

    return {
      id: googleId,
      email,
      username: rawUserInfo.email?.split('@')[0], // 从邮箱提取用户名
      name: rawUserInfo.name,
      firstName: rawUserInfo.given_name,
      lastName: rawUserInfo.family_name,
      avatarUrl: rawUserInfo.picture,
      provider: 'google',
      providerAccountId: String(googleId),
      raw: rawUserInfo
    };
  }
}