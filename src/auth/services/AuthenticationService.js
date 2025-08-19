/**
 * 认证服务 - 处理用户身份验证的核心逻辑
 */
import bcrypt from 'bcryptjs';
import * as User from '../../services/userService.js';
import { signEmailToken } from '../jwt.js';
import { sendVerifyEmail } from '../../mail/resend.js';
import { PUBLIC_BASE_URL } from '../../config/env.js';
import { decrypt } from '../cryptoUtils.js';

export class AuthenticationService {
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
}