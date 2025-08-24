/**
 * 登录策略 - 处理不同类型的登录方式
 */
import { AuthenticationService } from '../services/AuthenticationService.js';
import { TokenService } from '../services/TokenService.js';
import { PostLoginTaskService } from '../services/PostLoginTasksService.js';
import { recordLoginLog } from '../recordLoginLog.js';

export class BaseLoginStrategy {
  constructor() {
    this.authService = new AuthenticationService();
    this.tokenService = new TokenService();
    this.postLoginService = new PostLoginTaskService();
  }

  /**
   * 执行登录流程
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @param {Object} user 用户信息
   * @returns {Promise<void>}
   */
  async execute(req, res, user) {
    throw new Error('子类必须实现execute方法');
  }

  /**
   * 处理成功登录
   * @param {Object} req 
   * @param {Object} res 
   * @param {Object} user 
   * @param {string} loginType 
   * @returns {Promise<void>}
   * @protected
   */
  async _handleSuccessfulLogin(req, res, user, loginType) {
    // 生成并设置令牌
    const tokenInfo = await this.tokenService.generateAndSetTokens(user, req, res);
    
    // 立即发送响应
    res.json({ 
      ok: true, 
      tokenType: tokenInfo.tokenType, 
      expiresIn: tokenInfo.expiresIn 
    });

    // 异步执行后台任务
    this.postLoginService.executePostLoginTasks({
      req,
      user,
      loginType
    }).catch(error => {
      console.error(`[${loginType}] Post-login task failed:`, error);
    });
  }

  /**
   * 处理登录失败
   * @param {Object} req 
   * @param {Object} res 
   * @param {Object} user 
   * @param {string} reason 
   * @param {string} error 
   * @param {number} statusCode 
   * @returns {Promise<void>}
   * @protected
   */
  async _handleLoginFailure(req, res, user, reason, error, statusCode = 401) {
    await recordLoginLog({ req, user, success: false, reason });
    res.status(statusCode).json({ error });
  }
}

/**
 * 无2FA登录策略
 */
export class NoTwoFactorLoginStrategy extends BaseLoginStrategy {
  async execute(req, res, user) {
    console.log(`[2FA] 用户 ${user.id} 未开启2FA，直接登录`);
    await this._handleSuccessfulLogin(req, res, user, 'No 2FA');
  }
}

/**
 * TOTP登录策略
 */
export class TotpLoginStrategy extends BaseLoginStrategy {
  async execute(req, res, user, token) {
    console.log(`[2FA] 用户 ${user.id} 开始TOTP验证`);
    
    const result = await this.authService.verifyTotpToken(user, token);
    
    if (!result.success) {
      const statusCode = result.error === 'TOTP_REQUIRED' ? 206 : 401;
      await this._handleLoginFailure(
        req, res, user, 
        result.reason || '2FA验证失败', 
        result.error, 
        statusCode
      );
      return;
    }

    console.log(`[2FA] 用户 ${user.id} TOTP验证通过`);
    await this._handleSuccessfulLogin(req, res, user, 'TOTP');
  }
}

/**
 * 备份码登录策略
 */
export class BackupCodeLoginStrategy extends BaseLoginStrategy {
  async execute(req, res, user, backupCode) {
    console.log(`[2FA] 用户 ${user.id} 开始备份码验证`);
    
    const result = await this.authService.verifyBackupCode(user.id, backupCode);
    
    if (!result.success) {
      await this._handleLoginFailure(
        req, res, user, 
        result.reason, 
        result.error
      );
      return;
    }

    console.log(`[2FA] 用户 ${user.id} 备份码验证通过`);
    await this._handleSuccessfulLogin(req, res, user, 'Backup Code');
  }
}