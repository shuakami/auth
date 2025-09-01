/**
 * WebAuthn 客户端服务
 * 处理生物验证的客户端操作
 */
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import api from './api';

// WebAuthn 凭据接口定义
export interface WebAuthnCredential {
  id: string;
  name: string;
  deviceType: string;
  createdAt: string;
  lastUsedAt: string;
  backedUp?: boolean;
}

export interface WebAuthnSupport {
  supported: boolean;
  enabled: boolean;
  credentialCount: number;
  credentials: WebAuthnCredential[];
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    alg: number;
    type: string;
  }>;
  timeout?: number;
  excludeCredentials?: Array<{
    id: string;
    type: string;
    transports?: string[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification?: 'required' | 'preferred' | 'discouraged';
    residentKey?: 'discouraged' | 'preferred' | 'required';
  };
  attestation?: 'none' | 'indirect' | 'direct';
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string;
    type: string;
    transports?: string[];
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

/**
 * WebAuthn 客户端服务类
 */
export class WebAuthnService {
  /**
   * 检查浏览器是否支持 WebAuthn
   */
  static isBrowserSupported(): boolean {
    return browserSupportsWebAuthn();
  }

  /**
   * 检查是否支持平台认证器（如 Touch ID, Face ID）
   */
  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    try {
      return await platformAuthenticatorIsAvailable();
    } catch (error) {
      console.warn('[WebAuthn] 检查平台认证器可用性失败:', error);
      return false;
    }
  }

  /**
   * 检查 WebAuthn 支持状态
   */
  static async checkSupport(): Promise<{
    browserSupported: boolean;
    platformSupported: boolean;
    canUse: boolean;
  }> {
    const browserSupported = this.isBrowserSupported();
    const platformSupported = browserSupported ? await this.isPlatformAuthenticatorAvailable() : false;
    
    return {
      browserSupported,
      platformSupported,
      canUse: browserSupported, // 即使没有平台认证器，也可以使用安全密钥
    };
  }

  /**
   * 开始注册流程
   */
  static async beginRegistration(): Promise<WebAuthnRegistrationOptions> {
    try {
      const response = await api.post('/api/webauthn/registration/begin');
      
      if (!response.data.ok) {
        throw new Error(response.data.error || '获取注册选项失败');
      }

      return response.data.options;
    } catch (error: any) {
      console.error('[WebAuthn] 开始注册失败:', error);
      throw new Error(error.response?.data?.message || error.message || '开始注册失败');
    }
  }

  /**
   * 完成注册流程
   */
  static async finishRegistration(
    options: WebAuthnRegistrationOptions,
    credentialName?: string
  ): Promise<WebAuthnCredential> {
    try {
      // 调用浏览器 WebAuthn API
      const attResp = await startRegistration(options);

      // 提交到服务器验证
      const response = await api.post('/api/webauthn/registration/finish', {
        response: attResp,
        credentialName: credentialName || 'Biometric Device',
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || '注册验证失败');
      }

      return response.data.credential;
    } catch (error: any) {
      console.error('[WebAuthn] 完成注册失败:', error);
      
      // 处理用户取消的情况
      if (error.name === 'NotAllowedError') {
        throw new Error('用户取消了生物验证注册');
      }
      
      // 处理设备不支持的情况
      if (error.name === 'NotSupportedError') {
        throw new Error('当前设备不支持生物验证');
      }

      throw new Error(error.response?.data?.message || error.message || '注册失败');
    }
  }

  /**
   * 开始认证流程
   */
  static async beginAuthentication(userId?: string): Promise<WebAuthnAuthenticationOptions> {
    try {
      const response = await api.post('/api/webauthn/authentication/begin', {
        userId,
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || '获取认证选项失败');
      }

      return response.data.options;
    } catch (error: any) {
      console.error('[WebAuthn] 开始认证失败:', error);
      throw new Error(error.response?.data?.message || error.message || '开始认证失败');
    }
  }

  /**
   * 完成认证流程
   */
  static async finishAuthentication(
    options: WebAuthnAuthenticationOptions,
    userId?: string
  ): Promise<{
    user: any;
    accessToken: string;
    credential: WebAuthnCredential;
  }> {
    try {
      // 调用浏览器 WebAuthn API
      const asseResp = await startAuthentication(options);

      // 提交到服务器验证
      const response = await api.post('/api/webauthn/authentication/finish', {
        response: asseResp,
        userId,
      });

      if (!response.data.ok) {
        throw new Error(response.data.error || '认证验证失败');
      }

      return {
        user: response.data.user,
        accessToken: response.data.accessToken,
        credential: response.data.credential,
      };
    } catch (error: any) {
      console.error('[WebAuthn] 完成认证失败:', error);
      
      // 处理用户取消的情况
      if (error.name === 'NotAllowedError') {
        throw new Error('用户取消了生物验证');
      }
      
      // 处理设备不支持的情况
      if (error.name === 'NotSupportedError') {
        throw new Error('当前设备不支持生物验证');
      }

      throw new Error(error.response?.data?.message || error.message || '认证失败');
    }
  }

  /**
   * 获取用户的凭据列表
   */
  static async getCredentials(): Promise<WebAuthnCredential[]> {
    try {
      const response = await api.get('/api/webauthn/credentials');
      
      if (!response.data.ok) {
        throw new Error(response.data.error || '获取凭据列表失败');
      }

      return response.data.credentials;
    } catch (error: any) {
      console.error('[WebAuthn] 获取凭据列表失败:', error);
      throw new Error(error.response?.data?.message || error.message || '获取凭据列表失败');
    }
  }

  /**
   * 更新凭据名称
   */
  static async updateCredentialName(credentialId: string, newName: string): Promise<void> {
    try {
      const response = await api.put(`/api/webauthn/credentials/${credentialId}/name`, {
        name: newName,
      });
      
      if (!response.data.ok) {
        throw new Error(response.data.error || '更新凭据名称失败');
      }
    } catch (error: any) {
      console.error('[WebAuthn] 更新凭据名称失败:', error);
      throw new Error(error.response?.data?.message || error.message || '更新凭据名称失败');
    }
  }

  /**
   * 删除凭据
   */
  static async deleteCredential(credentialId: string): Promise<void> {
    try {
      const response = await api.delete(`/api/webauthn/credentials/${credentialId}`);
      
      if (!response.data.ok) {
        throw new Error(response.data.error || '删除凭据失败');
      }
    } catch (error: any) {
      console.error('[WebAuthn] 删除凭据失败:', error);
      throw new Error(error.response?.data?.message || error.message || '删除凭据失败');
    }
  }

  /**
   * 获取生物验证支持状态
   */
  static async getBiometricSupport(): Promise<WebAuthnSupport> {
    try {
      const response = await api.get('/api/webauthn/support');
      
      if (!response.data.ok) {
        throw new Error(response.data.error || '获取支持状态失败');
      }

      const { ok, ...support } = response.data;
      return support;
    } catch (error: any) {
      console.error('[WebAuthn] 获取支持状态失败:', error);
      throw new Error(error.response?.data?.message || error.message || '获取支持状态失败');
    }
  }
}

export default WebAuthnService;