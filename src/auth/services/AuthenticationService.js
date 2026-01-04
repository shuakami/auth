/**
 * 认证服务 - 处理用户身份验证的核心逻辑
 */

import * as User from '../../services/userService.js';
import { signEmailToken } from '../jwt.js';
import { sendVerifyEmail } from '../../mail/resend.js';
import { PUBLIC_BASE_URL } from '../../config/env.js';
import { decrypt } from '../cryptoUtils.js';
import { PostLoginTasksService } from './PostLoginTasksService.js';
import { TokenService } from './TokenService.js';

// ----------------------- 内部小工具（惰性加载与轻量方法） -----------------------

/** 惰性加载 bcrypt：优先原生 bcrypt，失败时回退到 bcryptjs。 */
let __bcryptPromise = null;
async function getBcryptModule() {
  if (!__bcryptPromise) {
    __bcryptPromise = (async () => {
      try {
        const mod = await import('bcrypt'); // 原生绑定（优先）
        return mod.default || mod;
      } catch {
        const mod = await import('bcryptjs'); // 兜底
        return mod.default || mod;
      }
    })();
  }
  return __bcryptPromise;
}

/** 统一的 compare 包装：兼容 bcrypt/bcryptjs 的不同接口形态，始终返回 Promise<boolean> */
async function bcryptCompare(password, hash) {
  const bcrypt = await getBcryptModule();

  // 优先使用 Promise 形态
  if (typeof bcrypt.compare === 'function') {
    try {
      const maybe = bcrypt.compare(password, hash);
      if (typeof maybe === 'boolean') {
        return maybe;
      }
      if (maybe && typeof maybe.then === 'function') {
        return await maybe;
      }
    } catch (e) {
      // 某些实现 compare 无 Promise；继续走回调或同步
    }
  }
  // 回退：同步 compareSync
  if (typeof bcrypt.compareSync === 'function') {
    return bcrypt.compareSync(password, hash);
  }
  // 回退：回调 compare
  if (typeof bcrypt.compare === 'function') {
    return await new Promise((resolve, reject) =>
      bcrypt.compare(password, hash, (err, same) => (err ? reject(err) : resolve(same)))
    );
  }
  throw new Error('No compatible bcrypt compare implementation found.');
}

/** 惰性缓存 TOTP 与备份码校验模块 */
let __totpModulePromise = null;
async function getVerifyTotpFn() {
  if (!__totpModulePromise) {
    __totpModulePromise = import('../totp.js');
  }
  const mod = await __totpModulePromise;
  return mod.verifyTotp;
}
let __backupCodesModulePromise = null;
async function getVerifyBackupCodeFn() {
  if (!__backupCodesModulePromise) {
    __backupCodesModulePromise = import('../backupCodes.js');
  }
  const mod = await __backupCodesModulePromise;
  return mod.verifyBackupCode;
}

/** 无验签解析 JWT 的 exp（用于刚生成的 accessToken，避免重复重签名验证） */
function decodeJwtExp(token) {
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const buf = Buffer.from(normalized, 'base64');
    const payload = JSON.parse(buf.toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** 将后台任务安排到事件循环后端并且不保活容器 */
function scheduleBackground(task) {
  // setImmediate 返回的 Immediate 在 Node.js 中具备 unref()
  const im = setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch(err => console.error('[AuthenticationService] 后台任务执行失败:', err));
  });
  if (typeof im.unref === 'function') im.unref();
}

// ------------------------------ 主服务类 --------------------------------------

export class AuthenticationService {
  constructor() {
    this.postLoginTasks = new PostLoginTasksService();
    this.tokenService = new TokenService();
  }

  /**
   * 完整的用户认证流程
   * @param {object} context - 包含 email, password, totpToken, backupCode, deviceInfo, res, req, is2faOnly 的上下文对象
   * @returns {Promise<object>} 认证结果
   */
  async authenticate(context) {
    const { email, password, totpToken, backupCode, deviceInfo, res, req, is2faOnly } = context;
    let user;

    if (is2faOnly) {
      // 2FA 流程：跳过密码验证
      user = await User.findByEmail(email);
      if (!user) {
        return { status: 'failed', error: 'User not found for 2FA' };
      }
    } else {
      // 完整登录流程：先验证凭据
      const credsResult = await this.verifyCredentials(email, password);
      if (!credsResult.success) {
        return { status: 'failed', error: credsResult.error };
      }
      user = credsResult.user;
    }

    // 2. 邮箱验证状态（两种流程均需要）
    const emailVerification = await this.checkEmailVerification(user);
    if (!emailVerification.verified) {
      return { status: 'failed', error: emailVerification.error, message: emailVerification.message };
    }

    // 3. 是否要求 2FA
    if (!this.requires2FA(user)) {
      // 无 2FA，直接登录成功
      return await this._handleSuccessfulLogin(user, deviceInfo, res, req, 'No 2FA');
    }

    // 4. 需要 2FA，是否提供了 token 或 backupCode
    if (!totpToken && !backupCode) {
      return { status: '2fa_required' };
    }

    // 5. 校验 2FA
    const twoFactorResult = await this.verify2FA({ user, totpToken, backupCode });
    if (!twoFactorResult.success) {
      return { status: 'failed', error: twoFactorResult.error, reason: twoFactorResult.reason };
    }

    // 6. 2FA 通过，登录成功
    const loginType = totpToken ? 'TOTP' : 'Backup Code';
    return await this._handleSuccessfulLogin(user, deviceInfo, res, req, loginType);
  }

  /**
   * 验证 2FA 凭据 (TOTP 或 备份码)
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

    const isValidPassword = await bcryptCompare(password, user.password_hash);
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
   * 验证 TOTP 令牌
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

    const verifyTotp = await getVerifyTotpFn();
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
    const verifyBackupCode = await getVerifyBackupCodeFn();
    const isValid = await verifyBackupCode(userId, backupCode);

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
   * 检查是否需要 2FA 验证
   * @param {Object} user
   * @returns {boolean}
   */
  requires2FA(user) {
    return !!user.totp_secret;
  }

  /**
   * 处理登录成功后的逻辑 - 创建 JWT、设置 cookie、并执行后台任务
   * @param {Object} user 用户对象
   * @param {Object} deviceInfo 设备信息（可选：覆盖 UA）
   * @param {Object} res Express响应对象
   * @param {Object} req Express请求对象
   * @param {string} loginType 登录类型
   * @returns {Object} 包含 status, userId, exp 的对象
   * @private
   */
  async _handleSuccessfulLogin(user, deviceInfo, res, req, loginType) {
    try {
      // 1) 生成并设置 token cookies（含 access 与 refresh）
      const tokenInfo = await this.tokenService.generateAndSetTokens(user, req, res);

      // 2) 准备后台任务参数
      const ua = deviceInfo || (req && req.headers ? req.headers['user-agent'] : '');
      const safeReq = {
        headers: { 'user-agent': ua },
        ip: req && req.ip ? req.ip : '',
        body: (req && req.body) ? req.body : {}
      };

      // 3) 同步执行后台任务（Vercel serverless 会在响应后终止）
      // 为了保证登录历史记录正确，必须在响应前完成
      // GeoIP 查询已设置 5 秒超时，不会过度延迟
      try {
        await this.postLoginTasks.executePostLoginTasks({
          req: safeReq,
          user,
          loginType
        });
      } catch (taskError) {
        console.error('[AuthenticationService] 登录后任务执行失败:', taskError);
      }

      // 4) 解析 access token 的过期时间（避免重复验签）
      const expDecoded = tokenInfo && tokenInfo.accessToken ? decodeJwtExp(tokenInfo.accessToken) : null;
      const exp = expDecoded ?? (Math.floor(Date.now() / 1000) + 1800); // 默认30分钟

      return {
        status: 'success',
        userId: user.id,
        exp
      };
    } catch (error) {
      console.error('[AuthenticationService] 登录成功处理失败:', error);
      return {
        status: 'failed',
        error: 'login_processing_failed',
        message: '登录处理失败'
      };
    }
  }
}
