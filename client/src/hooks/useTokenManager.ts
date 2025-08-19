/**
 * Token管理器React Hook
 * 提供便捷的token状态和操作接口
 */

import { useState, useEffect, useCallback } from 'react';
import { tokenManager, TokenInfo } from '../services/EnhancedTokenManager';

export interface TokenStatus {
  exp: number | null;
  timeToExpire: number | null;
  isExpired: boolean;
  isVisible: boolean;
  isRefreshing: boolean;
  lastActivity: number;
  timeSinceActivity: number;
}

export function useTokenManager() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(() => {
    const status = tokenManager.getStatus();
    return {
      exp: status.exp,
      timeToExpire: status.timeToExpire,
      isExpired: status.isExpired,
      isVisible: status.isVisible,
      isRefreshing: status.isRefreshing,
      lastActivity: status.lastActivity,
      timeSinceActivity: status.timeSinceActivity
    };
  });

  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // 更新状态的函数
  const updateStatus = useCallback(() => {
    const status = tokenManager.getStatus();
    setTokenStatus({
      exp: status.exp,
      timeToExpire: status.timeToExpire,
      isExpired: status.isExpired,
      isVisible: status.isVisible,
      isRefreshing: status.isRefreshing,
      lastActivity: status.lastActivity,
      timeSinceActivity: status.timeSinceActivity
    });
  }, []);

  // 手动刷新token
  const manualRefresh = useCallback(async () => {
    try {
      setLastError(null);
      const success = await tokenManager.manualRefresh();
      if (success) {
        setRefreshCount(prev => prev + 1);
        setLastRefreshTime(new Date());
      }
      return success;
    } catch (error) {
      setLastError(error as Error);
      return false;
    }
  }, []);

  // 获取token信息的便捷方法
  const getTokenInfo = useCallback(() => {
    return tokenManager.getTokenInfo();
  }, []);

  // 设置效果和清理
  useEffect(() => {
    // 设置事件监听器
    tokenManager.setListeners({
      onTokenRefreshed: (tokenInfo: TokenInfo) => {
        console.log('[useTokenManager] Token刷新成功');
        setLastRefreshTime(new Date());
        setRefreshCount(prev => prev + 1);
        setLastError(null);
        updateStatus();
      },
      onTokenExpired: () => {
        console.log('[useTokenManager] Token已过期');
        updateStatus();
      },
      onRefreshFailed: (error: Error) => {
        console.error('[useTokenManager] Token刷新失败:', error);
        setLastError(error);
        updateStatus();
      }
    });

    // 定期更新状态（每10秒）
    const interval = setInterval(updateStatus, 10000);

    // 初始状态更新
    updateStatus();

    return () => {
      clearInterval(interval);
    };
  }, [updateStatus]);

  // 格式化时间的辅助函数
  const formatTimeToExpire = useCallback((seconds: number | null) => {
    if (seconds === null || seconds <= 0) return '已过期';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds}秒`;
    } else {
      return `${minutes}分${remainingSeconds}秒`;
    }
  }, []);

  const formatTimeSinceActivity = useCallback((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}秒前`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}分钟前`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}小时前`;
  }, []);

  return {
    // 状态
    tokenStatus,
    lastRefreshTime,
    refreshCount,
    lastError,
    
    // 操作
    manualRefresh,
    getTokenInfo,
    
    // 格式化辅助
    formatTimeToExpire: (seconds?: number | null) => 
      formatTimeToExpire(seconds ?? tokenStatus.timeToExpire),
    formatTimeSinceActivity: (milliseconds?: number) => 
      formatTimeSinceActivity(milliseconds ?? tokenStatus.timeSinceActivity),
    
    // 状态计算
    isNearExpiration: tokenStatus.timeToExpire !== null && tokenStatus.timeToExpire < 300, // 5分钟内
    isRecentlyActive: tokenStatus.timeSinceActivity < 5 * 60 * 1000, // 5分钟内有活动
    shouldShowWarning: tokenStatus.timeToExpire !== null && 
                      tokenStatus.timeToExpire < 600 && 
                      tokenStatus.timeToExpire > 0, // 10分钟内但未过期
  };
}