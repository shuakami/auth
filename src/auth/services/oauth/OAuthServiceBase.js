/**
 * OAuth服务基类 - 抽象OAuth流程的通用逻辑
 */
import { v4 as uuidv4 } from 'uuid';
import { PUBLIC_BASE_URL } from '../../../config/env.js';

export class OAuthServiceBase {
  constructor(config) {
    this.config = config;
    this.providerName = config.providerName;
  }

  /**
   * 生成授权URL
   * @param {Object} options 额外的授权参数
   * @returns {string} 授权URL
   */
  generateAuthUrl(options = {}) {
    const { returnUrl, ...restOptions } = options;
    const stateData = {
      id: uuidv4(),
      returnUrl: returnUrl || null,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    const redirectUri = `${PUBLIC_BASE_URL}/api/${this.providerName}/callback`;
    
    console.log(`[OAuth] ${this.providerName} 授权请求 redirect_uri:`, redirectUri);
    
    const params = {
      ...this.getAuthParams(),
      redirect_uri: redirectUri,
      state,
      ...restOptions
    };

    const queryString = new URLSearchParams(params).toString();
    return `${this.config.authUrl}?${queryString}`;
  }

  /**
   * 获取授权参数 - 子类需要实现
   * @returns {Object}
   */
  getAuthParams() {
    throw new Error('子类必须实现getAuthParams方法');
  }

  /**
   * 交换授权码获取访问令牌 - 子类需要实现
   * @param {string} code 授权码
   * @returns {Promise<string>} 访问令牌
   */
  async exchangeCodeForToken(code) {
    throw new Error('子类必须实现exchangeCodeForToken方法');
  }

  /**
   * 获取用户信息 - 子类需要实现
   * @param {string} accessToken 访问令牌
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(accessToken) {
    throw new Error('子类必须实现getUserInfo方法');
  }

  /**
   * 标准化用户信息格式
   * @param {Object} rawUserInfo 原始用户信息
   * @returns {Object} 标准化后的用户信息
   */
  normalizeUserInfo(rawUserInfo) {
    throw new Error('子类必须实现normalizeUserInfo方法');
  }

  /**
   * 完整的OAuth用户信息获取流程
   * @param {string} code 授权码
   * @returns {Promise<Object>} 标准化的用户信息
   */
  async getOAuthUserInfo(code, state) {
    try {
      // 1. 交换访问令牌
      const accessToken = await this.exchangeCodeForToken(code);
      if (!accessToken) {
        throw new Error(`${this.providerName}授权失败`);
      }

      // 2. 获取用户信息
      const rawUserInfo = await this.getUserInfo(accessToken);
      
      // 3. 标准化用户信息
      const normalizedUserInfo = this.normalizeUserInfo(rawUserInfo);

      console.log(`[OAuth] ${this.providerName} 用户信息获取成功:`, {
        id: normalizedUserInfo.id,
        email: normalizedUserInfo.email
      });

      return normalizedUserInfo;

    } catch (error) {
      console.error(`[OAuth] ${this.providerName} 用户信息获取失败:`, error);
      throw error;
    }
  }

  /**
   * 生成回调重定向URI
   * @returns {string}
   */
  getRedirectUri() {
    return `${PUBLIC_BASE_URL}/api/${this.providerName}/callback`;
  }
}