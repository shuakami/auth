/**
 * 认证服务控制器
 * 提供一个统一的入口点来协调各种认证服务
 */
import { UserService } from './user/UserService.js';
import { UserOAuthService } from './user/UserOAuthService.js';
import { UserTotpService } from './user/UserTotpService.js';
import { PasswordResetService } from './auth/PasswordResetService.js';
import { LoginHistoryService } from './auth/LoginHistoryService.js';
import { BackupCodeService } from './auth/BackupCodeService.js';
import { TokenServiceController } from './token/TokenServiceController.js';

export class AuthServiceController {
  constructor() {
    // 初始化所有服务
    this.userService = new UserService();
    this.userOAuthService = new UserOAuthService();
    this.userTotpService = new UserTotpService();
    this.passwordResetService = new PasswordResetService();
    this.loginHistoryService = new LoginHistoryService();
    this.backupCodeService = new BackupCodeService();
    this.tokenService = new TokenServiceController();
  }

  // ================== 用户管理 ==================

  /**
   * 查找用户（多种方式）
   */
  async findUser(criteria) {
    const { email, id, username, githubId, googleId } = criteria;

    if (email) return this.userService.findByEmail(email);
    if (id) return this.userService.findById(id);
    if (username) return this.userService.findByUsername(username);
    if (githubId) return this.userService.findByGithubId(githubId);
    if (googleId) return this.userService.findByGoogleId(googleId);

    throw new Error('必须提供至少一个查找条件');
  }

  /**
   * 创建用户
   */
  async createUser(userData) {
    return this.userService.createUser(userData);
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updates) {
    const results = {};

    if (updates.email) {
      results.email = await this.userService.updateEmail(userId, updates.email);
    }

    if (updates.username !== undefined) {
      results.username = await this.userService.updateUsername(userId, updates.username);
    }

    if (updates.verified !== undefined) {
      results.verified = await this.userService.updateEmailVerified(userId, updates.verified);
    }

    if (updates.passwordHash) {
      results.passwordHash = await this.userService.migratePasswordHash(userId, updates.passwordHash);
    }

    return results;
  }

  /**
   * 获取用户完整信息
   */
  async getUserProfile(userId) {
    const [user, stats, oauthBindings, totpConfig] = await Promise.all([
      this.userService.findById(userId),
      this.userService.getUserStats(userId),
      this.userOAuthService.getOAuthBindings(userId),
      this.userTotpService.getTotpConfig(userId)
    ]);

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        verified: user.verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      stats,
      oauth: oauthBindings,
      totp: totpConfig
    };
  }

  // ================== OAuth管理 ==================

  /**
   * 绑定OAuth账号
   */
  async bindOAuthAccount(userId, provider, oauthId) {
    switch (provider) {
      case 'github':
        return this.userOAuthService.bindGithubId(userId, oauthId);
      case 'google':
        return this.userOAuthService.bindGoogleId(userId, oauthId);
      default:
        throw new Error(`不支持的OAuth提供商: ${provider}`);
    }
  }

  /**
   * 解绑OAuth账号
   */
  async unbindOAuthAccount(userId, provider) {
    switch (provider) {
      case 'github':
        return this.userOAuthService.unbindGithubId(userId);
      case 'google':
        return this.userOAuthService.unbindGoogleId(userId);
      default:
        throw new Error(`不支持的OAuth提供商: ${provider}`);
    }
  }

  // ================== TOTP管理 ==================

  /**
   * 配置TOTP
   */
  async setupTotp(userId, secret) {
    return this.userTotpService.setTotpSecret(userId, secret);
  }

  /**
   * 启用TOTP
   */
  async enableTotp(userId) {
    const enabled = await this.userTotpService.enableTotp(userId);
    
    if (enabled) {
      // 生成备份码
      await this.backupCodeService.generateAndSaveBackupCodes(userId);
    }

    return enabled;
  }

  /**
   * 禁用TOTP
   */
  async disableTotp(userId) {
    return this.userTotpService.disableTotp(userId);
  }

  /**
   * 获取TOTP密钥
   */
  async getTotpSecret(userId) {
    return this.userTotpService.getTotpSecret(userId);
  }

  // ================== 备份码管理 ==================

  /**
   * 生成备份码
   */
  async generateBackupCodes(userId, options = {}) {
    return this.backupCodeService.generateAndSaveBackupCodes(userId, options);
  }

  /**
   * 验证备份码
   */
  async verifyBackupCode(userId, code, metadata = {}) {
    return this.backupCodeService.verifyBackupCode(userId, code, metadata);
  }

  /**
   * 获取备份码统计
   */
  async getBackupCodeStats(userId) {
    return this.backupCodeService.getBackupCodeStats(userId);
  }

  // ================== 密码重置 ==================

  /**
   * 创建密码重置令牌
   */
  async createPasswordResetToken(email, options = {}) {
    return this.passwordResetService.createResetToken(email, options);
  }

  /**
   * 验证密码重置令牌
   */
  async verifyPasswordResetToken(token) {
    return this.passwordResetService.verifyResetToken(token);
  }

  /**
   * 重置密码
   */
  async resetPassword(token, newPassword, metadata = {}) {
    return this.passwordResetService.resetPassword(token, newPassword, metadata);
  }

  // ================== 登录历史 ==================

  /**
   * 记录登录历史
   */
  async recordLogin(loginData) {
    return this.loginHistoryService.recordLogin(loginData);
  }

  /**
   * 获取登录历史
   */
  async getLoginHistory(userId, options = {}) {
    return this.loginHistoryService.getLoginHistory(userId, options);
  }

  /**
   * 获取登录统计
   */
  async getLoginStats(userId, options = {}) {
    return this.loginHistoryService.getLoginStats(userId, options);
  }

  /**
   * 检测异常登录模式
   */
  async detectAnomalousLoginPatterns(userId, options = {}) {
    return this.loginHistoryService.detectAnomalousPatterns(userId, options);
  }

  // ================== Token管理 ==================

  /**
   * 创建刷新令牌
   */
  async createRefreshToken(userId, deviceInfo, parentId = null, expiresIn) {
    return this.tokenService.createRefreshToken(userId, deviceInfo, parentId, expiresIn);
  }

  /**
   * 验证刷新令牌
   */
  async validateRefreshToken(token) {
    return this.tokenService.validateRefreshToken(token);
  }

  /**
   * 轮换刷新令牌
   */
  async rotateRefreshToken(oldToken, deviceInfo) {
    return this.tokenService.rotateRefreshToken(oldToken, deviceInfo);
  }

  /**
   * 获取用户会话
   */
  async getUserSessions(userId) {
    return this.tokenService.getSessionAggregatedInfoForUser(userId);
  }

  /**
   * 吊销用户会话
   */
  async revokeUserSession(sessionId, reason = '') {
    return this.tokenService.revokeRefreshTokenById(sessionId, reason);
  }

  /**
   * 吊销用户所有会话
   */
  async revokeAllUserSessions(userId) {
    return this.tokenService.revokeAllRefreshTokensForUser(userId);
  }

  // ================== 综合安全分析 ==================

  /**
   * 获取用户安全概览
   */
  async getUserSecurityOverview(userId) {
    try {
      const [
        userProfile,
        sessions,
        loginStats,
        backupCodeStats,
        anomalousPatterns
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserSessions(userId),
        this.getLoginStats(userId, { days: 30 }),
        this.getBackupCodeStats(userId),
        this.detectAnomalousLoginPatterns(userId)
      ]);

      // 计算安全评分
      const securityScore = this._calculateSecurityScore({
        userProfile,
        sessions,
        loginStats,
        backupCodeStats,
        anomalousPatterns
      });

      return {
        user: userProfile.user,
        security: {
          score: securityScore,
          totp: userProfile.totp,
          oauth: userProfile.oauth,
          backupCodes: backupCodeStats,
          activeSessions: sessions.length,
          recentLogins: loginStats.basic,
          anomalies: anomalousPatterns
        },
        recommendations: this._generateSecurityRecommendations({
          userProfile,
          sessions,
          backupCodeStats,
          anomalousPatterns,
          securityScore
        })
      };

    } catch (error) {
      console.error('[AuthServiceController] 获取用户安全概览失败:', error);
      throw new Error('获取用户安全概览失败');
    }
  }

  /**
   * 执行安全维护任务
   */
  async performSecurityMaintenance() {
    try {
      const results = {};

      // 清理过期数据
      const [
        expiredTokens,
        expiredResetTokens,
        expiredBackupCodes,
        oldLoginHistory
      ] = await Promise.all([
        this.tokenService.performMaintenance(),
        this.passwordResetService.cleanupExpiredTokens(),
        this.backupCodeService.cleanupExpiredCodes(),
        this.loginHistoryService.cleanupOldHistory()
      ]);

      results.cleanup = {
        expiredTokens: expiredTokens.expiredSessionsCleaned || 0,
        expiredResetTokens,
        expiredBackupCodes,
        oldLoginHistory
      };

      console.log('[AuthServiceController] 安全维护任务完成:', results);
      return results;

    } catch (error) {
      console.error('[AuthServiceController] 安全维护任务失败:', error);
      throw new Error('安全维护任务失败');
    }
  }

  // ================== 私有方法 ==================

  /**
   * 计算用户安全评分
   * @param {Object} data 用户数据
   * @returns {number} 安全评分 (0-100)
   * @private
   */
  _calculateSecurityScore(data) {
    let score = 0;

    // 基础分数
    score += 20;

    // 邮箱验证 (+10分)
    if (data.userProfile.user.verified) {
      score += 10;
    }

    // TOTP启用 (+25分)
    if (data.userProfile.totp.enabled) {
      score += 25;
    }

    // 备份码 (+10分)
    if (data.backupCodeStats.available > 0) {
      score += 10;
    }

    // OAuth绑定 (+10分)
    if (data.userProfile.oauth.github.bound || data.userProfile.oauth.google.bound) {
      score += 10;
    }

    // 登录历史正常 (+15分)
    if (data.loginStats.basic.successRate > 90) {
      score += 15;
    }

    // 无异常活动 (+10分)
    if (!data.anomalousPatterns.anomaliesDetected) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * 生成安全建议
   * @param {Object} data 用户数据
   * @returns {Array} 安全建议列表
   * @private
   */
  _generateSecurityRecommendations(data) {
    const recommendations = [];

    if (!data.userProfile.user.verified) {
      recommendations.push({
        type: 'EMAIL_VERIFICATION',
        priority: 'HIGH',
        message: '请验证您的邮箱地址以提高账户安全性'
      });
    }

    if (!data.userProfile.totp.enabled) {
      recommendations.push({
        type: 'ENABLE_2FA',
        priority: 'HIGH',
        message: '启用两步验证可大幅提升账户安全性'
      });
    }

    if (data.backupCodeStats.available <= 2 && data.userProfile.totp.enabled) {
      recommendations.push({
        type: 'REGENERATE_BACKUP_CODES',
        priority: 'MEDIUM',
        message: '您的备份码即将用完，建议重新生成'
      });
    }

    if (!data.userProfile.oauth.github.bound && !data.userProfile.oauth.google.bound) {
      recommendations.push({
        type: 'BIND_OAUTH',
        priority: 'LOW',
        message: '绑定GitHub或Google账号可提供额外的登录方式'
      });
    }

    if (data.anomalousPatterns.anomaliesDetected) {
      recommendations.push({
        type: 'SECURITY_REVIEW',
        priority: 'HIGH',
        message: '检测到异常登录活动，建议检查账户安全'
      });
    }

    if (data.sessions.length > 5) {
      recommendations.push({
        type: 'REVIEW_SESSIONS',
        priority: 'MEDIUM',
        message: '您有较多活跃会话，建议检查并清理不必要的会话'
      });
    }

    return recommendations;
  }

  // ================== 服务访问器 ==================

  /**
   * 获取各个服务的实例（用于高级操作）
   */
  getServices() {
    return {
      user: this.userService,
      userOAuth: this.userOAuthService,
      userTotp: this.userTotpService,
      passwordReset: this.passwordResetService,
      loginHistory: this.loginHistoryService,
      backupCode: this.backupCodeService,
      token: this.tokenService
    };
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches() {
    this.userService.clearCache();
    console.log('[AuthServiceController] 所有缓存已清除');
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    return {
      initialized: true,
      services: {
        user: !!this.userService,
        userOAuth: !!this.userOAuthService,
        userTotp: !!this.userTotpService,
        passwordReset: !!this.passwordResetService,
        loginHistory: !!this.loginHistoryService,
        backupCode: !!this.backupCodeService,
        token: !!this.tokenService
      },
      cache: this.userService.getCacheStats()
    };
  }
}