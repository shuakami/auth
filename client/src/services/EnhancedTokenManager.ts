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
    if (this.isRefreshing || !this.accessTokenExp) {
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = this.accessTokenExp - now;
    const timeSinceActivity = Date.now() - this.lastActivity;
    
    const shouldRefresh = force || (
      timeToExpire < this.config.refreshThreshold && 
      timeSinceActivity < this.config.activityTimeout
    );
    
    if (shouldRefresh) {
      console.log(`[EnhancedTokenManager] 准备刷新token，距离过期：${timeToExpire}秒，最后活动：${Math.round(timeSinceActivity / 1000)}秒前`);
      await this.performRefresh();
    }
  }

  /**
   * 执行token刷新
   */
  private async performRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('[EnhancedTokenManager] 刷新已在进行中，跳过');
      return false;
    }

    this.isRefreshing = true;
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        console.log(`[EnhancedTokenManager] 执行token刷新 (尝试 ${retries + 1}/${this.config.maxRetries})`);
        
        // 动态导入以避免循环依赖
        const apiClient = (await import('./api')).default;
        const response = await apiClient.post('/refresh');

        if (response.status === 200) {
          const data = response.data;
          
          if (data.exp && data.expiresIn) {
            this.updateTokenExpiration(data.exp);
            
            console.log(`[EnhancedTokenManager] ✅ Token刷新成功，新过期时间：${new Date(data.exp * 1000).toLocaleString()}`);
            
            // 触发成功回调
            this.listeners.onTokenRefreshed?.({
              exp: data.exp,
              expiresIn: data.expiresIn
            });
            
            this.isRefreshing = false;
            return true;
          }
        } else {
          const errorData = response.data;
          throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        retries++;
        console.error(`[EnhancedTokenManager] ❌ Token刷新失败 (尝试 ${retries}/${this.config.maxRetries}):`, error);
        
        // @ts-expect-error
        const statusCode = error.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          console.error('[EnhancedTokenManager] 收到 401/403 错误，可能是Refresh Token已失效，将停止重试。');
          this.listeners.onRefreshFailed?.(error as Error);
          this.handleRefreshFailure();
          break; // 立即中断重试
        }
        
        if (retries < this.config.maxRetries) {
          console.log(`[EnhancedTokenManager] ${this.config.retryDelay / 1000}秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        } else {
          // 最后一次尝试失败
          this.listeners.onRefreshFailed?.(error as Error);
          this.handleRefreshFailure();
        }
      }
    }

    this.isRefreshing = false;
    return false;
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
   * 检查认证状态（不再自动刷新，避免循环）
   */
  private async checkAuthenticationStatus() {
    try {
      await fetchCurrentUser();
      console.log('[EnhancedTokenManager] 认证状态检查通过');
      return true;
    } catch (error) {
      console.warn('[EnhancedTokenManager] 认证状态检查失败:', error);
      // 不再自动刷新token，避免无限循环
      // 让其他机制（如API拦截器）处理401错误
      return false;
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
    console.log('[EnhancedTokenManager] 手动触发token刷新');
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
    
    // 清除所有监听器，防止回调干扰
    this.listeners = {};
    
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