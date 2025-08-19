/**
 * 登录控制器 - 协调登录流程
 */
import { AuthenticationService } from '../services/AuthenticationService.js';
import { 
  NoTwoFactorLoginStrategy, 
  TotpLoginStrategy, 
  BackupCodeLoginStrategy 
} from '../strategies/LoginStrategies.js';

export class LoginController {
  constructor() {
    this.authService = new AuthenticationService();
    this.strategies = {
      noTwoFactor: new NoTwoFactorLoginStrategy(),
      totp: new TotpLoginStrategy(),
      backupCode: new BackupCodeLoginStrategy()
    };
  }

  /**
   * 处理登录请求
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @returns {Promise<void>}
   */
  async handleLogin(req, res) {
    const { email, password, token, backupCode } = req.body;

    // 1. 验证基本凭据
    const credentialResult = await this.authService.verifyCredentials(email, password);
    if (!credentialResult.success) {
      return res.status(401).json({ error: credentialResult.error });
    }

    const { user } = credentialResult;
    console.log('[LOGIN] 查询到用户信息:', user);

    // 2. 检查邮箱验证状态
    const emailVerificationResult = await this.authService.checkEmailVerification(user);
    if (!emailVerificationResult.verified) {
      return res.status(403).json({
        error: emailVerificationResult.error,
        message: emailVerificationResult.message,
        emailSent: emailVerificationResult.emailSent
      });
    }

    // 3. 处理2FA验证
    if (this.authService.requires2FA(user)) {
      return this._handle2FALogin(req, res, user, { token, backupCode });
    }

    // 4. 无2FA登录
    return this.strategies.noTwoFactor.execute(req, res, user);
  }

  /**
   * 处理2FA登录
   * @param {Object} req 
   * @param {Object} res 
   * @param {Object} user 
   * @param {Object} options
   * @returns {Promise<void>}
   * @private
   */
  async _handle2FALogin(req, res, user, { token, backupCode }) {
    console.log(`[2FA] 用户 ${user.id} 检测到 totp_secret，强制要求2FA校验`);

    // 优先尝试备份码
    if (backupCode) {
      return this.strategies.backupCode.execute(req, res, user, backupCode);
    }

    // 使用TOTP令牌
    return this.strategies.totp.execute(req, res, user, token);
  }
}