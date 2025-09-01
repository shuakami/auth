/**
 * WebAuthn 认证服务 (使用 @passwordless-id/webauthn)
 * 处理生物验证的注册和验证流程
 */
import { server } from '@passwordless-id/webauthn';
import * as WebAuthnCredential from '../../services/webauthnCredentialService.js';
import * as User from '../../services/userService.js';
import crypto from 'crypto';

// WebAuthn 配置常量
const RP_NAME = 'Auth系统';
const RP_ID = process.env.NODE_ENV === 'production' ? 'auth.sdjz.wiki' : 'localhost';
const ORIGIN = process.env.NODE_ENV === 'production' ? 
  'https://auth.sdjz.wiki' : 
  ['http://localhost:3000', 'http://localhost:3001'];

export class WebAuthnService {
  constructor() {
    this.challenges = new Map();
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
  async _storeChallenge(userId, challenge, type) {
    this._cleanupExpiredChallenges();
    
    // 同时存储在内存和数据库中（兼容性）
    this.challenges.set(`${userId}-${type}`, {
      challenge,
      timestamp: Date.now()
    });

    // 存储到数据库（serverless友好）
    try {
      const { smartQuery } = await import('../../db/index.js');
      await smartQuery(
        `INSERT INTO webauthn_challenges (user_id, challenge_type, challenge_value, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, challenge_type) 
         DO UPDATE SET challenge_value = $3, expires_at = $4`,
        [userId, type, challenge, new Date(Date.now() + this.CHALLENGE_TTL)]
      );
      console.log(`[WebAuthnService] Challenge stored in database for ${userId}-${type}`);
    } catch (error) {
      console.warn(`[WebAuthnService] Failed to store challenge in database:`, error);
    }
  }

  /**
   * 获取并删除挑战值
   * @param {string} userId 用户ID
   * @param {string} type 类型
   * @returns {string|null}
   */
  async _getAndRemoveChallenge(userId, type) {
    const key = `${userId}-${type}`;
    
    // 首先尝试从内存获取
    const memData = this.challenges.get(key);
    if (memData) {
      this.challenges.delete(key);
      console.log(`[WebAuthnService] Challenge retrieved from memory for ${userId}-${type}`);
      return memData.challenge;
    }

    // 如果内存中没有，从数据库获取（serverless环境）
    try {
      const { smartQuery } = await import('../../db/index.js');
      const result = await smartQuery(
        `SELECT challenge_value FROM webauthn_challenges 
         WHERE user_id = $1 AND challenge_type = $2 AND expires_at > NOW()`,
        [userId, type]
      );

      if (result.rows.length > 0) {
        const challenge = result.rows[0].challenge_value;
        
        // 删除使用过的challenge
        await smartQuery(
          `DELETE FROM webauthn_challenges WHERE user_id = $1 AND challenge_type = $2`,
          [userId, type]
        );
        
        console.log(`[WebAuthnService] Challenge retrieved from database for ${userId}-${type}`);
        return challenge;
      }
    } catch (error) {
      console.warn(`[WebAuthnService] Failed to retrieve challenge from database:`, error);
    }

    console.log(`[WebAuthnService] No valid challenge found for ${userId}-${type}`);
    return null;
  }

  /**
   * 生成随机挑战值
   * @returns {string}
   */
  _generateChallenge() {
    return crypto.randomBytes(32).toString('base64url');
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
      
      // 生成挑战值
      const challenge = this._generateChallenge();
      
      // 构建注册选项
      const options = {
        challenge,
        rp: {
          name: RP_NAME,
          id: RP_ID,
        },
        user: {
          id: Buffer.from(userId).toString('base64url'),
          name: user.email,
          displayName: user.username || user.email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
        },
        attestation: "none",
        excludeCredentials: existingCredentials.map(cred => ({
          type: "public-key",
          id: cred.credential_id,
        })),
      };

      // 存储挑战值
      await this._storeChallenge(userId, challenge, 'registration');

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
      const expectedChallenge = await this._getAndRemoveChallenge(userId, 'registration');
      if (!expectedChallenge) {
        throw new Error('无效或过期的挑战值');
      }

      // 获取用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 构建期望的验证参数
      const expected = {
        challenge: expectedChallenge,
        origin: Array.isArray(ORIGIN) ? ORIGIN[0] : ORIGIN,
        userVerified: false, // 不强制要求用户验证
      };

      console.log(`[WebAuthnService] Verifying registration for user ${userId}`);
      console.log(`[WebAuthnService] Expected:`, expected);

      // 使用新库验证注册响应
      const registrationParsed = await server.verifyRegistration(response, expected);

      if (!registrationParsed) {
        throw new Error('注册验证失败');
      }

      console.log(`[WebAuthnService] Registration verification successful:`, registrationParsed);

      // 保存凭据到数据库
      const savedCredential = await WebAuthnCredential.saveCredential({
        userId,
        credentialId: registrationParsed.credential.id,
        credentialPublicKey: Buffer.from(registrationParsed.credential.publicKey, 'base64'),
        counter: registrationParsed.credential.counter || 0,
        credentialDeviceType: registrationParsed.credential.type || 'unknown',
        credentialBackedUp: registrationParsed.credential.backup || false,
        transports: registrationParsed.credential.transports ? JSON.stringify(registrationParsed.credential.transports) : null,
        name: credentialName,
      });

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
      let allowCredentials = [];

      if (userId) {
        // 获取用户的凭据
        const credentials = await WebAuthnCredential.getCredentialsByUserId(userId);
        allowCredentials = credentials.map(cred => ({
          type: "public-key",
          id: cred.credential_id,
          transports: cred.transports ? JSON.parse(cred.transports) : undefined,
        }));
      }

      // 生成挑战值
      const challenge = this._generateChallenge();

      // 生成认证选项
      const options = {
        challenge,
        rpId: RP_ID,
        allowCredentials,
        userVerification: "preferred",
      };

      // 存储挑战值（如果有用户ID）
      const challengeKey = userId || 'anonymous';
      await this._storeChallenge(challengeKey, challenge, 'authentication');

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
      // 通过凭据ID查找凭据
      const credentialId = response.id;
      console.log(`[WebAuthnService] Authentication: Looking for credential with ID: ${credentialId}`);
      
      const credential = await WebAuthnCredential.getCredentialById(credentialId);
      if (!credential) {
        throw new Error('未找到匹配的凭据');
      }

      console.log(`[WebAuthnService] Authentication: Found credential with ID: ${credential.credential_id}`);

      // 如果提供了用户ID，验证凭据是否属于该用户
      if (userId && credential.user_id !== userId) {
        throw new Error('凭据不属于指定用户');
      }

      // 获取存储的挑战值
      const challengeKey = userId || 'anonymous';
      const expectedChallenge = await this._getAndRemoveChallenge(challengeKey, 'authentication');
      
      if (!expectedChallenge) {
        throw new Error('无效或过期的挑战值');
      }

      console.log(`[WebAuthnService] Authentication: Expected challenge: ${expectedChallenge}`);

      // 构建期望的验证参数
      const expected = {
        challenge: expectedChallenge,
        origin: Array.isArray(ORIGIN) ? ORIGIN[0] : ORIGIN,
        userVerified: false,
        counter: parseInt(credential.counter) || 0,
      };

      // 构建认证凭据信息
      const credentialKey = {
        id: credential.credential_id,
        publicKey: credential.credential_public_key.toString('base64'),
        algorithm: 'ES256', // 默认算法
      };

      console.log(`[WebAuthnService] Authentication: Verifying with expected:`, expected);
      console.log(`[WebAuthnService] Authentication: Credential key:`, credentialKey);

      // 使用新库验证认证响应
      const authenticationParsed = await server.verifyAuthentication(response, expected, credentialKey);

      if (!authenticationParsed) {
        throw new Error('认证验证失败');
      }

      console.log(`[WebAuthnService] Authentication verification successful:`, authenticationParsed);

      // 更新凭据计数器
      const newCounter = authenticationParsed.authenticator?.counter || (parseInt(credential.counter) + 1);
      await WebAuthnCredential.updateCredentialCounter(credential.credential_id, newCounter);

      console.log(`[WebAuthnService] 认证验证成功 for user ${credential.user_id}`);

      return {
        verified: true,
        userId: credential.user_id,
        credentialId: credential.credential_id,
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
      const credentials = await WebAuthnCredential.getCredentialsByUserId(userId);
      
      return {
        supported: true,
        hasCredentials: credentials.length > 0,
        credentialsCount: credentials.length,
        credentials: credentials.map(cred => ({
          id: cred.id,
          name: cred.name,
          deviceType: cred.credential_device_type,
          createdAt: cred.created_at,
          lastUsedAt: cred.last_used_at,
        }))
      };
    } catch (error) {
      console.error('[WebAuthnService] 检查生物验证支持失败:', error);
      return {
        supported: false,
        hasCredentials: false,
        credentialsCount: 0,
        credentials: []
      };
    }
  }
}