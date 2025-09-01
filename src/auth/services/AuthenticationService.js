/**
 * 认证服务 - 处理用户身份验证的核心逻辑
 */
import bcrypt from 'bcryptjs';
import * as User from '../../services/userService.js';
import { signEmailToken, signAccessToken, verifyAccessToken } from '../jwt.js';
import { sendVerifyEmail } from '../../mail/resend.js';
import { PUBLIC_BASE_URL } from '../../config/env.js';
import { decrypt } from '../cryptoUtils.js';

import { PostLoginTasksService } from './PostLoginTasksService.js';
import { TokenService } from './TokenService.js';

export class AuthenticationService {
  constructor() {
    this.postLoginTasks = new PostLoginTasksService();
    this.tokenService = new TokenService();
  }
  
  /**
   * 完整的用户认证流程
   * @param {object} context - 包含 email, password, totpToken, backupCode, deviceInfo, res, req 的上下文对象
   * @returns {Promise<object>} 认证结果
   */
  async authenticate(context) {
    const { email, password, totpToken, backupCode, deviceInfo, res, req, is2faOnly } = context;
    let user;

    if (is2faOnly) {
      // 2FA 流程，跳过密码验证，直接查找用户
      user = await User.findByEmail(email);
      if (!user) {
        return { status: 'failed', error: 'User not found for 2FA' };
      }
    } else {
      // 完整登录流程，验证凭据
      const credsResult = await this.verifyCredentials(email, password);
      if (!credsResult.success) {
        return { status: 'failed', error: credsResult.error };
      }
      user = credsResult.user;
    }

    // 2. 检查邮箱验证状态 (两个流程都需要)
    const emailVerification = await this.checkEmailVerification(user);
    if (!emailVerification.verified) {
      return { status: 'failed', error: emailVerification.error, message: emailVerification.message };
    }

    // 3. 检查是否需要2FA
    if (!this.requires2FA(user)) {
      // 不需要2FA，登录成功
      return await this._handleSuccessfulLogin(user, deviceInfo, res, req, 'No 2FA');
    }

    // 4. 需要2FA，检查是否提供了 token 或 backupCode
    if (!totpToken && !backupCode) {
      return { status: '2fa_required' };
    }

    // 5. 验证2FA
    const twoFactorResult = await this.verify2FA({ user, totpToken, backupCode });
    if (!twoFactorResult.success) {
      return { status: 'failed', error: twoFactorResult.error, reason: twoFactorResult.reason };
    }

    // 6. 2FA验证通过，登录成功
    const loginType = totpToken ? 'TOTP' : 'Backup Code';
    return await this._handleSuccessfulLogin(user, deviceInfo, res, req, loginType);
  }

  /**
   * 验证2FA凭据 (TOTP 或 备份码)
   * @param {object} context - 包含 user, totpToken, backupCode 的对象
   * @returns {Promise<object>} 验证结果
   */
  async verify2FA(context) {
    const { user, totpToken, backupCode } = context;

    if (totpToken) {
      return this.verifyTotpToken(user, totpToken);
    }
    if (backupCode) {
      return this.verifyBackupCode(user.id, backupCode);
    }
    return { success: false, error: 'No 2FA token or backup code provided' };
  }


  /**
   * 验证用户凭据
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} 验证结果
   */
  async verifyCredentials(email, password) {
    const user = await User.findByEmail(email);
    
    if (!user) {
      return { success: false, error: '账号或密码错误' };
    }
    
    if (!user.password_hash) {
      return { success: false, error: '请用第三方账号登录' };
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return { success: false, error: '账号或密码错误' };
    }
    
    return { success: true, user };
  }

  /**
   * 检查邮箱验证状态
   * @param {Object} user 
   * @returns {Promise<Object>}
   */
  async checkEmailVerification(user) {
    if (user.verified) {
      return { verified: true };
    }

    // 重新发送验证邮件
    const verificationToken = signEmailToken({ id: user.id });
    const verificationLink = `${PUBLIC_BASE_URL}/verify?token=${verificationToken}`;
    const emailSent = await sendVerifyEmail(user.email, verificationLink);
    
    return {
      verified: false,
      error: 'email_not_verified',
      message: '您的邮箱尚未验证，请先完成邮箱验证。我们已重新发送一封验证邮件。',
      emailSent
    };
  }

  /**
   * 验证TOTP令牌
   * @param {Object} user 
   * @param {string} token 
   * @returns {Promise<Object>}
   */
  async verifyTotpToken(user, token) {
    if (!token) {
      return { success: false, error: 'TOTP_REQUIRED' };
    }

    const encryptedSecret = user.totp_secret;
    if (!encryptedSecret) {
      return { 
        success: false, 
        error: 'Internal server error during 2FA setup.',
        reason: '2FA密钥缺失'
      };
    }

    const decryptedSecret = decrypt(encryptedSecret);
    if (!decryptedSecret) {
      return { 
        success: false, 
        error: 'Internal server error during 2FA verification.',
        reason: '2FA密钥解密失败'
      };
    }

    const { verifyTotp } = await import('../totp.js');
    const isValid = verifyTotp(decryptedSecret, token);
    
    if (!isValid) {
      return { 
        success: false, 
        error: 'invalid token',
        reason: '2FA验证码错误'
      };
    }

    return { success: true };
  }

  /**
   * 验证备份码
   * @param {string} userId 
   * @param {string} backupCode 
   * @returns {Promise<Object>}
   */
  async verifyBackupCode(userId, backupCode) {
    const { verifyBackupCode: verifyBackupCodeFn } = await import('../backupCodes.js');
    const isValid = await verifyBackupCodeFn(userId, backupCode);
    
    if (!isValid) {
      return { 
        success: false, 
        error: 'invalid backup code',
        reason: '2FA备份码错误'
      };
    }

    return { success: true };
  }

  /**
   * 检查是否需要2FA验证
   * @param {Object} user 
   * @returns {boolean}
   */
  requires2FA(user) {
    return !!user.totp_secret;
  }

  /**
   * 处理登录成功后的逻辑 - 创建JWT token、设置cookie并执行后台任务
   * @param {Object} user 用户对象
   * @param {Object} deviceInfo 设备信息
   * @param {Object} res Express响应对象
   * @param {Object} req Express请求对象
   * @param {string} loginType 登录类型
   * @returns {Object} 包含status, userId, exp的对象
   * @private
   */
  async _handleSuccessfulLogin(user, deviceInfo, res, req, loginType) {
    try {
      // 1. 生成并设置token cookies（包括access token和refresh token）
      const tokenInfo = await this.tokenService.generateAndSetTokens(user, req, res);
      
      // 2. 异步执行登录后的后台任务（不影响响应速度）
      // 注意：这里使用setTimeout让后台任务异步执行，不阻塞响应
      setTimeout(async () => {
        try {
          await this.postLoginTasks.executePostLoginTasks({
            req: { 
              headers: { 'user-agent': deviceInfo || req.headers['user-agent'] }, 
              ip: req.ip,
              body: req.body || {} // 添加body属性，避免undefined错误
            },
            user,
            loginType
          });
        } catch (error) {
          console.error(`[AuthenticationService] 后台任务执行失败:`, error);
        }
      }, 0);
      
      // 3. 解析access token获得过期时间戳
      const decoded = verifyAccessToken(tokenInfo.accessToken);
      const exp = decoded ? decoded.exp : Math.floor(Date.now() / 1000) + 1800; // 默认30分钟
      
      return { 
        status: 'success', 
        userId: user.id, 
        exp 
      };
    } catch (error) {
      console.error(`[AuthenticationService] 登录成功处理失败:`, error);
      return { 
        status: 'failed', 
        error: 'login_processing_failed', 
        message: '登录处理失败' 
      };
    }
  }
}