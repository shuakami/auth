/**
 * 增强的Token管理器
 * 解决页面关闭后auth验证被退登的问题
 * 
 * 主要功能：
 * 1. 基于时间的主动token刷新
 * 2. 页面可见性感知
 * 3. 用户活动跟踪
 * 4. 智能刷新策略
 */

import { fetchCurrentUser } from './api';

export interface TokenInfo {
  exp: number;
  expiresIn: number;
}

export class EnhancedTokenManager {
  private static instance: EnhancedTokenManager | null = null;
  
  private accessTokenExp: number | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private lastActivity = Date.now();
  private isVisible: boolean;
  
  // 配置选项
  private readonly config = {
    checkInterval: 60000, // 检查间隔：1分钟
    refreshThreshold: 180, // 刷新阈值：过期前3分钟
    activityTimeout: 30 * 60 * 1000, // 活动超时：30分钟
    maxRetries: 3,
    retryDelay: 5000
  };

  // 事件监听器
  private listeners: {
    onTokenRefreshed?: (tokenInfo: TokenInfo) => void;
    onTokenExpired?: () => void;
    onRefreshFailed?: (error: Error) => void;
  } = {};

  private constructor() {
    // Initialize isVisible with a server-safe check to prevent build errors
    this.isVisible = typeof document !== 'undefined' && !document.hidden;
    this.init();
  }

  public static getInstance(): EnhancedTokenManager {
    if (!EnhancedTokenManager.instance) {
      EnhancedTokenManager.instance = new EnhancedTokenManager();
    }
    return EnhancedTokenManager.instance;
  }

  private init() {
    // 确保只在浏览器环境中执行
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('[EnhancedTokenManager] Skipping initialization on server.');
      return;
    }

    console.log('[EnhancedTokenManager] 初始化增强token管理器');
    
    this.setupVisibilityListener();
    this.setupActivityTracking();
    this.startPeriodicRefresh();
    
    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * 设置页面可见性监听器
   */
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      const wasVisible = this.isVisible;
      this.isVisible = !document.hidden;
      
      if (!wasVisible && this.isVisible) {
        console.log('[EnhancedTokenManager] 页面恢复可见，检查token状态');
        
        // 页面恢复可见时立即检查认证状态
        this.checkAuthenticationStatus();
        
        // 如果需要刷新token，立即刷新
        this.checkAndRefreshToken(true);
      }
    });
    
    console.log('[EnhancedTokenManager] 页面可见性监听器已设置');
  }

  /**
   * 设置用户活动跟踪
   */
  private setupActivityTracking() {
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    console.log('[EnhancedTokenManager] 用户活动跟踪已设置');
  }

  /**
   * 开始定期刷新检查
   */
  private startPeriodicRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.config.checkInterval);
    
    console.log(`[EnhancedTokenManager] 定期检查已启动，间隔：${this.config.checkInterval / 1000}秒`);
  }

  /**
   * 检查并刷新token
   */
  private async checkAndRefreshToken(force = false) {
    // 该函数现在只负责在适当的时候触发一次认证状态检查
    // 真正的刷新逻辑由api.ts中的拦截器全权负责
    if (!this.accessTokenExp) return;

    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = this.accessTokenExp - now;
    const timeSinceActivity = Date.now() - this.lastActivity;

    const shouldCheck = force || (
      timeToExpire < this.config.refreshThreshold && 
      timeSinceActivity < this.config.activityTimeout
    );

    if (shouldCheck) {
      console.log(`[EnhancedTokenManager] Token即将过期，主动检查认证状态...`);
      // 通过调用一个受保护的端点来触发拦截器（如果需要）
      // 这统一了刷新逻辑，避免了竞争条件
      try {
        await fetchCurrentUser();
      } catch (error) {
        // 拦截器会处理刷新。如果错误冒泡到这里，说明刷新彻底失败。
        console.error('[EnhancedTokenManager] 主动认证检查失败，拦截器未能恢复会话。', error);
      }
    }
  }

  /**
   * 执行token刷新
   */
  private async performRefresh(): Promise<boolean> {
    // 这个方法被废弃，所有逻辑统一到api.ts拦截器
    console.warn('[EnhancedTokenManager] performRefresh() is deprecated. Refresh is now handled by API interceptor.');
    if (this.isRefreshing) return false;

    this.isRefreshing = true;
    try {
      console.log('[EnhancedTokenManager] 触发一次认证状态检查来启动刷新...');
      await fetchCurrentUser();
      // 如果上面的调用成功（可能因为拦截器刷新成功），我们认为刷新是成功的
      console.log('[EnhancedTokenManager] 认证状态检查成功。');
      return true;
    } catch (error) {
      console.error('[EnhancedTokenManager] 认证状态检查失败:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 处理刷新失败
   */
  private handleRefreshFailure() {
    console.error('[EnhancedTokenManager] 所有刷新尝试均失败，停止自动刷新');
    
    // 停止自动刷新，防止无限重试
    this.stopAutoRefresh();
    
    // 触发过期回调
    this.listeners.onTokenExpired?.();
  }

  /**
   * 检查认证状态
   */
  private async checkAuthenticationStatus() {
    try {
      await fetchCurrentUser();
      console.log('[EnhancedTokenManager] 认证状态检查通过');
    } catch (error) {
      console.warn('[EnhancedTokenManager] 认证状态检查失败:', error);
      
      // 如果是401错误，可能token已过期，尝试刷新
      if ((error as any).response?.status === 401) {
        await this.performRefresh();
      }
    }
  }

  /**
   * 更新token过期时间
   */
  public updateTokenExpiration(exp: number) {
    const oldExp = this.accessTokenExp;
    this.accessTokenExp = exp;
    
    if (oldExp !== exp) {
      console.log(`[EnhancedTokenManager] Token过期时间已更新：${new Date(exp * 1000).toLocaleString()}`);
    }
  }

  /**
   * 获取token信息
   */
  public getTokenInfo(): { exp: number | null; timeToExpire: number | null; isExpired: boolean } {
    if (!this.accessTokenExp) {
      return { exp: null, timeToExpire: null, isExpired: true };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = this.accessTokenExp - now;
    
    return {
      exp: this.accessTokenExp,
      timeToExpire,
      isExpired: timeToExpire <= 0
    };
  }

  /**
   * 设置事件监听器
   */
  public setListeners(listeners: {
    onTokenRefreshed?: (tokenInfo: TokenInfo) => void;
    onTokenExpired?: () => void;
    onRefreshFailed?: (error: Error) => void;
  }) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * 手动触发token刷新
   */
  public async manualRefresh(): Promise<boolean> {
    // 手动刷新现在也只是触发一次认证检查
    console.log('[EnhancedTokenManager] 手动触发刷新，将检查认证状态...');
    return this.performRefresh();
  }

  /**
   * 获取状态信息
   */
  public getStatus() {
    const tokenInfo = this.getTokenInfo();
    const timeSinceActivity = Date.now() - this.lastActivity;
    
    return {
      ...tokenInfo,
      isVisible: this.isVisible,
      isRefreshing: this.isRefreshing,
      lastActivity: this.lastActivity,
      timeSinceActivity,
      config: this.config
    };
  }

  /**
   * 停止自动刷新（用于退登时）
   */
  public stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.isRefreshing = false;
    this.accessTokenExp = null;
    
    console.log('[EnhancedTokenManager] 自动刷新已停止');
  }

  /**
   * 重新启动自动刷新（用于重新登录时）
   */
  public restartAutoRefresh() {
    // 先停止现有的定时器
    this.stopAutoRefresh();
    
    // 重新启动定时器
    this.startPeriodicRefresh();
    
    console.log('[EnhancedTokenManager] 自动刷新已重新启动');
  }

  /**
   * 清理资源
   */
  private cleanup() {
    this.stopAutoRefresh();
    console.log('[EnhancedTokenManager] 资源已清理');
  }

  /**
   * 销毁实例
   */
  public destroy() {
    this.cleanup();
    EnhancedTokenManager.instance = null;
  }
}

// 单例访问
export const tokenManager = EnhancedTokenManager.getInstance();