/**
 * WebAuthn 认证服务 (使用 @passwordless-id/webauthn)
 */

import * as WebAuthnCredential from '../../services/webauthnCredentialService.js';
import * as User from '../../services/userService.js';
import crypto from 'crypto';

// 惰性导入 @passwordless-id/webauthn
let __webauthnServerPromise = null;
async function getWebAuthnServer() {
  if (!__webauthnServerPromise) {
    __webauthnServerPromise = import('@passwordless-id/webauthn').then(m => m.server);
  }
  return __webauthnServerPromise;
}

// smartQuery 惰性导入缓存
let __smartQueryPromise = null;
async function getSmartQuery() {
  if (!__smartQueryPromise) {
    __smartQueryPromise = import('../../db/index.js').then(m => m.smartQuery);
  }
  return __smartQueryPromise;
}

// 轻量日志门控
const DEBUG =
  (process.env.NODE_ENV !== 'production' && process.env.DEBUG_WEBAUTHN !== '0') ||
  process.env.DEBUG_WEBAUTHN === '1';
function dlog(...args) {
  if (DEBUG) console.log(...args);
}

// WebAuthn 配置常量
const RP_NAME = 'Auth系统';
const RP_ID = process.env.NODE_ENV === 'production' ? 'auth.sdjz.wiki' : 'localhost';
const ORIGIN =
  process.env.NODE_ENV === 'production'
    ? 'https://auth.sdjz.wiki'
    : ['http://localhost:3000', 'http://localhost:3001'];

export class WebAuthnService {
  constructor() {
    this.challenges = new Map();
    this.CHALLENGE_TTL = 5 * 60 * 1000; // 5分钟过期
  }

  /** 清理过期挑战值（内存） */
  _cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [key, data] of this.challenges.entries()) {
      if (now - data.timestamp > this.CHALLENGE_TTL) {
        this.challenges.delete(key);
      }
    }
  }

  /**
   * 存储挑战值（内存 + 数据库）
   * @param {string} userId
   * @param {string} challenge
   * @param {string} type 'registration' | 'authentication'
   */
  async _storeChallenge(userId, challenge, type) {
    this._cleanupExpiredChallenges();

    // 内存存储
    this.challenges.set(`${userId}-${type}`, {
      challenge,
      timestamp: Date.now()
    });

    // 数据库存储（serverless 友好）
    try {
      const smartQuery = await getSmartQuery();
      await smartQuery(
        `INSERT INTO webauthn_challenges (user_id, challenge_type, challenge_value, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, challenge_type)
         DO UPDATE SET challenge_value = $3, expires_at = $4`,
        [userId, type, challenge, new Date(Date.now() + this.CHALLENGE_TTL)]
      );
      dlog(`[WebAuthnService] Challenge stored in database for ${userId}-${type}`);
    } catch (error) {
      console.warn(`[WebAuthnService] Failed to store challenge in database:`, error);
    }
  }

  /**
   * 获取并删除挑战值（内存优先，DB 退化为单条 DELETE ... RETURNING）
   * @param {string} userId
   * @param {string} type
   * @returns {Promise<string|null>}
   */
  async _getAndRemoveChallenge(userId, type) {
    const key = `${userId}-${type}`;

    // 内存优先
    const memData = this.challenges.get(key);
    if (memData) {
      this.challenges.delete(key);
      dlog(`[WebAuthnService] Challenge retrieved from memory for ${userId}-${type}`);
      return memData.challenge;
    }

    // DB: 单条 DELETE RETURNING 减少往返与竞争窗口
    try {
      const smartQuery = await getSmartQuery();
      const result = await smartQuery(
        `DELETE FROM webauthn_challenges
           WHERE user_id = $1 AND challenge_type = $2 AND expires_at > NOW()
           RETURNING challenge_value`,
        [userId, type]
      );
      if (result.rows && result.rows.length > 0) {
        const challenge = result.rows[0].challenge_value;
        dlog(`[WebAuthnService] Challenge retrieved from database for ${userId}-${type}`);
        return challenge;
      }
    } catch (error) {
      console.warn(`[WebAuthnService] Failed to retrieve challenge from database:`, error);
    }

    dlog(`[WebAuthnService] No valid challenge found for ${userId}-${type}`);
    return null;
  }

  /** 生成随机挑战值 */
  _generateChallenge() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 生成注册选项
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async generateRegistrationOptions(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const existingCredentials = await WebAuthnCredential.getCredentialsByUserId(userId);
      dlog(`[WebAuthnService] Found ${existingCredentials.length} existing credentials for user ${userId}`);

      const challenge = this._generateChallenge();

      const options = {
        challenge,
        rp: {
          name: RP_NAME,
          id: RP_ID
        },
        user: {
          id: Buffer.from(userId).toString('base64url'),
          name: user.email,
          displayName: user.username || user.email.split('@')[0]
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred'
        },
        attestation: 'none',
        excludeCredentials: existingCredentials.map(cred => ({
          type: 'public-key',
          id: cred.credential_id
        }))
      };

      await this._storeChallenge(userId, challenge, 'registration');
      dlog(`[WebAuthnService] 生成注册选项成功 for user ${userId}`);
      return options;
    } catch (error) {
      console.error('[WebAuthnService] 生成注册选项失败:', error);
      throw new Error('生成注册选项失败');
    }
  }

  /**
   * 验证注册响应
   * @param {string} userId
   * @param {Object} response
   * @param {string} credentialName
   * @returns {Promise<Object>}
   */
  async verifyRegistrationResponse(userId, response, credentialName = 'Biometric Device') {
    try {
      const expectedChallenge = await this._getAndRemoveChallenge(userId, 'registration');
      if (!expectedChallenge) {
        throw new Error('无效或过期的挑战值');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const expected = {
        challenge: expectedChallenge,
        origin: Array.isArray(ORIGIN) ? ORIGIN[0] : ORIGIN,
        userVerified: false
      };

      dlog(`[WebAuthnService] Verifying registration for user ${userId}`);

      const server = await getWebAuthnServer();
      const registrationParsed = await server.verifyRegistration(response, expected);
      if (!registrationParsed) {
        throw new Error('注册验证失败');
      }

      // 保存凭据到数据库
      const savedCredential = await WebAuthnCredential.saveCredential({
        userId,
        credentialId: registrationParsed.credential.id,
        credentialPublicKey: Buffer.from(registrationParsed.credential.publicKey, 'base64'),
        counter: registrationParsed.credential.counter || 0,
        credentialDeviceType: registrationParsed.credential.type || 'unknown',
        credentialBackedUp: registrationParsed.credential.backup || false,
        transports: registrationParsed.credential.transports
          ? JSON.stringify(registrationParsed.credential.transports)
          : null,
        name: credentialName
      });

      dlog(`[WebAuthnService] 注册验证成功 for user ${userId}, credential: ${savedCredential.id}`);

      return {
        verified: true,
        credential: savedCredential
      };
    } catch (error) {
      console.error('[WebAuthnService] 注册验证失败:', error);
      throw new Error(error.message || '注册验证失败');
    }
  }

  /**
   * 生成认证选项
   * @param {string|null} userId
   * @returns {Promise<Object>}
   */
  async generateAuthenticationOptions(userId = null) {
    try {
      let allowCredentials = [];
      if (userId) {
        const credentials = await WebAuthnCredential.getCredentialsByUserId(userId);
        allowCredentials = credentials.map(cred => ({
          type: 'public-key',
          id: cred.credential_id,
          transports: cred.transports ? JSON.parse(cred.transports) : undefined
        }));
      }

      const challenge = this._generateChallenge();

      const options = {
        challenge,
        rpId: RP_ID,
        allowCredentials,
        userVerification: 'preferred'
      };

      const challengeKey = userId || 'anonymous';
      await this._storeChallenge(challengeKey, challenge, 'authentication');

      dlog(`[WebAuthnService] 生成认证选项成功 for ${userId || 'anonymous'}`);
      return options;
    } catch (error) {
      console.error('[WebAuthnService] 生成认证选项失败:', error);
      throw new Error('生成认证选项失败');
    }
  }

  /**
   * 验证认证响应
   * @param {Object} response
   * @param {string|null} userId
   * @returns {Promise<Object>}
   */
  async verifyAuthenticationResponse(response, userId = null) {
    try {
      if (!response || !response.id) {
        console.error(`[WebAuthnService] Invalid response object`);
        throw new Error('无效的认证响应对象：缺少credential ID');
      }

      const credentialId = response.id;
      dlog(`[WebAuthnService] Authentication: Looking for credential with ID: ${credentialId}`);

      const credential = await WebAuthnCredential.getCredentialById(credentialId);
      if (!credential) {
        throw new Error('未找到匹配的凭据');
      }
      dlog(`[WebAuthnService] Authentication: Found credential`);

      if (userId && credential.user_id !== userId) {
        throw new Error('凭据不属于指定用户');
      }

      const challengeKey = userId || 'anonymous';
      const expectedChallenge = await this._getAndRemoveChallenge(challengeKey, 'authentication');
      if (!expectedChallenge) {
        throw new Error('无效或过期的挑战值');
      }

      const credentialKey = {
        id: credential.credential_id,
        publicKey: credential.credential_public_key.toString('base64'),
        algorithm: 'ES256', // 保持与原逻辑一致
        counter: parseInt(credential.counter) || 0
      };

      const expected = {
        challenge: expectedChallenge,
        origin: Array.isArray(ORIGIN) ? ORIGIN[0] : ORIGIN,
        userVerified: false,
        counter: parseInt(credential.counter) || 0,
        verbose: DEBUG
      };

      const server = await getWebAuthnServer();
      const authenticationParsed = await server.verifyAuthentication(response, credentialKey, expected);
      if (!authenticationParsed) {
        throw new Error('认证验证失败');
      }

      const newCounter =
        authenticationParsed.counter !== undefined
          ? authenticationParsed.counter
          : (parseInt(credential.counter) || 0) + 1;

      await WebAuthnCredential.updateCredentialCounter(credential.credential_id, newCounter);
      dlog(`[WebAuthnService] 认证验证成功 for user ${credential.user_id}`);

      return {
        verified: true,
        userId: credential.user_id,
        credentialId: credential.credential_id,
        credential
      };
    } catch (error) {
      console.error('[WebAuthnService] 认证验证失败:', error);
      throw new Error(error.message || '认证验证失败');
    }
  }

  /**
   * 检查用户是否支持生物验证
   * @param {string} userId
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
          lastUsedAt: cred.last_used_at
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
