/**
 * WebAuthn 认证服务
 * 处理生物验证的注册和验证流程
 */
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array, isoBase64URL } from '@simplewebauthn/server/helpers';
import * as WebAuthnCredential from '../../services/webauthnCredentialService.js';
import * as User from '../../services/userService.js';

// WebAuthn 配置常量
const RP_NAME = 'Auth系统';
const RP_ID = process.env.NODE_ENV === 'production' ? 'auth.sdjz.wiki' : 'localhost';
const ORIGIN = process.env.NODE_ENV === 'production' ? 
  'https://auth.sdjz.wiki' : 
  ['http://localhost:3000', 'http://localhost:3001'];

export class WebAuthnService {
  constructor() {
    this.challenges = new Map(); // 临时存储挑战值
    this.CHALLENGE_TTL = 5 * 60 * 1000; // 5分钟过期
  }

  /**
   * 清理过期的挑战值
   */
  _cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [key, data] of this.challenges.entries()) {
      if (now - data.timestamp > this.CHALLENGE_TTL) {
        this.challenges.delete(key);
      }
    }
  }

  /**
   * 存储挑战值
   * @param {string} userId 用户ID
   * @param {string} challenge 挑战值
   * @param {string} type 类型 ('registration' | 'authentication')
   */
  _storeChallenge(userId, challenge, type) {
    this._cleanupExpiredChallenges();
    this.challenges.set(`${userId}-${type}`, {
      challenge,
      timestamp: Date.now()
    });
  }

  /**
   * 获取并删除挑战值
   * @param {string} userId 用户ID
   * @param {string} type 类型
   * @returns {string|null}
   */
  _getAndRemoveChallenge(userId, type) {
    const key = `${userId}-${type}`;
    const data = this.challenges.get(key);
    if (data) {
      this.challenges.delete(key);
      return data.challenge;
    }
    return null;
  }

  /**
   * 生成注册选项
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async generateRegistrationOptions(userId) {
    try {
      // 获取用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取用户现有凭据
      const existingCredentials = await WebAuthnCredential.getCredentialsByUserId(userId);
      console.log(`[WebAuthnService] Found ${existingCredentials.length} existing credentials for user ${userId}`);
      
      const excludeCredentials = existingCredentials.map(cred => {
        console.log(`[WebAuthnService] Processing credential: ${cred.credential_id}`);
        try {
          let credentialIdBuffer;
          
          // 首先尝试hex转换（新格式）
          if (/^[0-9A-Fa-f]+$/.test(cred.credential_id)) {
            credentialIdBuffer = isoUint8Array.fromHex(cred.credential_id);
            console.log(`[WebAuthnService] Successfully converted hex credential_id`);
          } else if (cred.credential_id.startsWith('0') && cred.credential_id.length > 20) {
            // 检查是否是错误编码的格式（每个字符前加0）
            const originalCredentialId = cred.credential_id.replace(/0(.)/g, '$1');
            console.log(`[WebAuthnService] Detected malformed credential_id, extracting: ${originalCredentialId}`);
            credentialIdBuffer = isoBase64URL.toBuffer(originalCredentialId);
            console.log(`[WebAuthnService] Successfully converted malformed credential_id`);
          } else {
            // 如果不是hex格式，尝试base64URL转换（旧格式或不同编码）
            console.log(`[WebAuthnService] Attempting base64URL conversion for credential_id: ${cred.credential_id}`);
            
            // 确保credential_id是字符串
            if (typeof cred.credential_id !== 'string') {
              throw new Error(`credential_id is not a string: ${typeof cred.credential_id}`);
            }
            
            credentialIdBuffer = isoBase64URL.toBuffer(cred.credential_id);
            console.log(`[WebAuthnService] Successfully converted base64URL credential_id`);
          }
          
          return {
            id: credentialIdBuffer,
            type: 'public-key',
            transports: cred.transports ? JSON.parse(cred.transports) : undefined,
          };
        } catch (error) {
          console.error(`[WebAuthnService] Failed to convert credential_id to buffer: ${cred.credential_id}`, error);
          // 跳过这个无效的凭据
          return null;
        }
      }).filter(Boolean); // 过滤掉null值

      // 生成注册选项
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: isoUint8Array.fromUTF8String(userId),
        userName: user.email,
        userDisplayName: user.username || user.email,
        attestationType: 'indirect',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform', // 优先使用平台认证器（如 Touch ID, Face ID）
        },
        supportedAlgorithmIDs: [-7, -257], // ES256 和 RS256
      });

      // 存储挑战值
      this._storeChallenge(userId, options.challenge, 'registration');

      console.log(`[WebAuthnService] 生成注册选项成功 for user ${userId}`);
      return options;

    } catch (error) {
      console.error('[WebAuthnService] 生成注册选项失败:', error);
      throw new Error('生成注册选项失败');
    }
  }

  /**
   * 验证注册响应
   * @param {string} userId 用户ID
   * @param {Object} response 客户端响应
   * @param {string} credentialName 凭据名称
   * @returns {Promise<Object>}
   */
  async verifyRegistrationResponse(userId, response, credentialName = 'Biometric Device') {
    try {
      // 获取存储的挑战值
      const expectedChallenge = this._getAndRemoveChallenge(userId, 'registration');
      if (!expectedChallenge) {
        throw new Error('无效或过期的挑战值');
      }

      // 验证注册响应
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false, // 与注册选项中的 'preferred' 对应，不强制要求
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('注册验证失败');
      }

      // 解构新的数据结构 (v13格式)
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      // 生成正确格式的credential ID
      const hexCredentialId = isoUint8Array.toHex(credentialID);
      console.log(`[WebAuthnService] Registration: Generated credential_id: ${hexCredentialId} (length: ${hexCredentialId.length})`);
      
      // 验证hex格式是否正确
      if (!/^[0-9A-Fa-f]+$/.test(hexCredentialId)) {
        console.error(`[WebAuthnService] Registration: Invalid hex format: ${hexCredentialId}`);
        throw new Error('生成的凭据ID格式无效');
      }

      // 保存凭据到数据库
      const savedCredential = await WebAuthnCredential.saveCredential({
        userId,
        credentialId: hexCredentialId,
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: response.response.transports ? JSON.stringify(response.response.transports) : null,
        name: credentialName,
      });
      
      console.log(`[WebAuthnService] Registration: Saved credential with ID: ${savedCredential.credential_id}`);

      console.log(`[WebAuthnService] 注册验证成功 for user ${userId}, credential: ${savedCredential.id}`);

      return {
        verified: true,
        credential: savedCredential,
      };

    } catch (error) {
      console.error('[WebAuthnService] 注册验证失败:', error);
      throw new Error(error.message || '注册验证失败');
    }
  }

  /**
   * 生成认证选项
   * @param {string} userId 用户ID（可选，用于无密码登录）
   * @returns {Promise<Object>}
   */
  async generateAuthenticationOptions(userId = null) {
    try {
      let allowCredentials;

      if (userId) {
        // 获取用户的凭据
        const credentials = await WebAuthnCredential.getCredentialsByUserId(userId);
        allowCredentials = credentials.map(cred => {
          try {
            let credentialIdBuffer;
            
            // 首先尝试hex转换（新格式）
            if (/^[0-9A-Fa-f]+$/.test(cred.credential_id)) {
              credentialIdBuffer = isoUint8Array.fromHex(cred.credential_id);
              console.log(`[WebAuthnService] Auth Options: Successfully converted hex credential_id`);
            } else if (cred.credential_id.startsWith('0') && cred.credential_id.length > 20) {
              // 检查是否是错误编码的格式（每个字符前加0）
              const originalCredentialId = cred.credential_id.replace(/0(.)/g, '$1');
              console.log(`[WebAuthnService] Auth Options: Detected malformed credential_id, extracting: ${originalCredentialId}`);
              credentialIdBuffer = isoBase64URL.toBuffer(originalCredentialId);
              console.log(`[WebAuthnService] Auth Options: Successfully converted malformed credential_id`);
            } else {
              // 如果不是hex格式，尝试base64URL转换（旧格式）
              console.log(`[WebAuthnService] Auth Options: Attempting base64URL conversion for credential_id: ${cred.credential_id}`);
              credentialIdBuffer = isoBase64URL.toBuffer(cred.credential_id);
              console.log(`[WebAuthnService] Auth Options: Successfully converted base64URL credential_id`);
            }
            
            return {
              id: credentialIdBuffer,
              type: 'public-key',
              transports: cred.transports ? JSON.parse(cred.transports) : undefined,
            };
          } catch (error) {
            console.error(`[WebAuthnService] Auth Options: Failed to convert credential_id: ${cred.credential_id}`, error);
            // 跳过这个无效的凭据
            return null;
          }
        }).filter(Boolean); // 过滤掉null值
      }

      // 生成认证选项
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials,
        userVerification: 'preferred',
      });

      // 存储挑战值（如果有用户ID）
      const challengeKey = userId || 'anonymous';
      this._storeChallenge(challengeKey, options.challenge, 'authentication');

      console.log(`[WebAuthnService] 生成认证选项成功 for ${userId || 'anonymous'}`);
      return options;

    } catch (error) {
      console.error('[WebAuthnService] 生成认证选项失败:', error);
      throw new Error('生成认证选项失败');
    }
  }

  /**
   * 验证认证响应
   * @param {Object} response 客户端响应
   * @param {string} userId 用户ID（可选）
   * @returns {Promise<Object>}
   */
  async verifyAuthenticationResponse(response, userId = null) {
    try {
      // response.id 已经是 base64url 编码的字符串
      const credentialIdBase64url = response.id;
      
      // 将 base64url 转换为 hex 格式
      const credentialIdBytes = isoBase64URL.toBuffer(credentialIdBase64url);
      const credentialIdHex = isoUint8Array.toHex(credentialIdBytes);
      
      console.log(`[WebAuthnService] Authentication: Looking for credential with base64url: ${credentialIdBase64url}, hex: ${credentialIdHex}`);
      
      // 首先尝试用hex格式查找凭据（新格式）
      let credential = await WebAuthnCredential.getCredentialById(credentialIdHex);
      
      if (!credential) {
        // 如果hex格式找不到，尝试用base64url格式查找（旧格式）
        console.log(`[WebAuthnService] Authentication: Hex format not found, trying base64url format`);
        credential = await WebAuthnCredential.getCredentialById(credentialIdBase64url);
      }
      
      if (!credential) {
        // 如果还找不到，尝试查找错误编码的格式（每个字符前加0）
        const malformedCredentialId = credentialIdBase64url.split('').map(char => '0' + char).join('');
        console.log(`[WebAuthnService] Authentication: Trying malformed format: ${malformedCredentialId}`);
        credential = await WebAuthnCredential.getCredentialById(malformedCredentialId);
      }
      
      if (!credential) {
        console.error(`[WebAuthnService] Authentication: No credential found for base64url: ${credentialIdBase64url} or hex: ${credentialIdHex}`);
        throw new Error('未找到匹配的凭据');
      }
      
      console.log(`[WebAuthnService] Authentication: Found credential with ID: ${credential.credential_id}`);

      // 如果提供了用户ID，验证凭据是否属于该用户
      if (userId && credential.user_id !== userId) {
        throw new Error('凭据不属于指定用户');
      }

      // 获取存储的挑战值
      const challengeKey = userId || 'anonymous';
      const expectedChallenge = this._getAndRemoveChallenge(challengeKey, 'authentication');
      if (!expectedChallenge) {
        throw new Error('无效或过期的挑战值');
      }

      // 验证认证响应
      let credentialIDBuffer;
      try {
        // 首先尝试hex转换（新格式）
        if (/^[0-9A-Fa-f]+$/.test(credential.credential_id)) {
          credentialIDBuffer = isoUint8Array.fromHex(credential.credential_id);
          console.log(`[WebAuthnService] Authentication: Successfully converted hex credential_id`);
        } else if (credential.credential_id.startsWith('0') && credential.credential_id.length > 20) {
          // 检查是否是错误编码的格式（每个字符前加0）
          const originalCredentialId = credential.credential_id.replace(/0(.)/g, '$1');
          console.log(`[WebAuthnService] Authentication: Detected malformed credential_id, extracting: ${originalCredentialId}`);
          credentialIDBuffer = isoBase64URL.toBuffer(originalCredentialId);
          console.log(`[WebAuthnService] Authentication: Successfully converted malformed credential_id`);
        } else {
          // 如果不是hex格式，尝试base64URL转换（旧格式）
          console.log(`[WebAuthnService] Authentication: Attempting base64URL conversion for credential_id: ${credential.credential_id}`);
          credentialIDBuffer = isoBase64URL.toBuffer(credential.credential_id);
          console.log(`[WebAuthnService] Authentication: Successfully converted base64URL credential_id`);
        }
      } catch (error) {
        console.error(`[WebAuthnService] Authentication: Failed to convert credential_id: ${credential.credential_id}`, error);
        throw new Error('无效的凭据格式');
      }

      // 验证credential对象的完整性
      console.log(`[WebAuthnService] Authentication: Credential data:`, {
        id: credential.credential_id,
        userId: credential.user_id,
        hasPublicKey: !!credential.credential_public_key,
        counter: credential.counter,
        counterType: typeof credential.counter,
        deviceType: credential.credential_device_type,
        backedUp: credential.credential_backed_up,
        transports: credential.transports,
      });

      if (!credential.credential_public_key) {
        throw new Error('凭据缺少公钥数据');
      }

      if (credential.counter === undefined || credential.counter === null) {
        console.warn(`[WebAuthnService] Authentication: Counter is null/undefined, defaulting to 0`);
        credential.counter = 0;
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: credentialIDBuffer,
          credentialPublicKey: new Uint8Array(credential.credential_public_key),
          counter: parseInt(credential.counter) || 0,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
        requireUserVerification: false, // 与认证选项中的 'preferred' 对应，不强制要求
      });

      if (!verification.verified) {
        throw new Error('认证验证失败');
      }

      // 更新凭据计数器（使用数据库中实际存储的格式）
      await WebAuthnCredential.updateCredentialCounter(
        credential.credential_id,
        verification.authenticationInfo.newCounter
      );

      console.log(`[WebAuthnService] 认证验证成功 for user ${credential.user_id}`);

      return {
        verified: true,
        userId: credential.user_id,
        credentialId: credential.credential_id, // 返回实际的credential_id格式
        credential,
      };

    } catch (error) {
      console.error('[WebAuthnService] 认证验证失败:', error);
      throw new Error(error.message || '认证验证失败');
    }
  }

  /**
   * 检查用户是否支持生物验证
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async checkBiometricSupport(userId) {
    try {
      const hasCredentials = await WebAuthnCredential.hasCredentials(userId);
      const credentials = await WebAuthnCredential.getCredentialsByUserId(userId);

      return {
        supported: true, // WebAuthn API 支持检测在客户端进行
        enabled: hasCredentials,
        credentialCount: credentials.length,
        credentials: credentials.map(cred => ({
          id: cred.id,
          name: cred.name,
          deviceType: cred.credential_device_type,
          createdAt: cred.created_at,
          lastUsedAt: cred.last_used_at,
        })),
      };

    } catch (error) {
      console.error('[WebAuthnService] 检查生物验证支持失败:', error);
      throw new Error('检查生物验证支持失败');
    }
  }
}