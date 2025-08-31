'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenRefreshManager } from '@/services/TokenRefreshManager';
import TokenRefreshOverlay from '@/components/ui/TokenRefreshOverlay';

interface TokenRefreshContextType {
  isRefreshing: boolean;
}

const TokenRefreshContext = createContext<TokenRefreshContextType | undefined>(undefined);

export const useTokenRefresh = () => {
  const context = useContext(TokenRefreshContext);
  if (context === undefined) {
    throw new Error('useTokenRefresh must be used within a TokenRefreshProvider');
  }
  return context;
};

interface TokenRefreshProviderProps {
  children: ReactNode;
}

export const TokenRefreshProvider: React.FC<TokenRefreshProviderProps> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // 监听Token刷新状态变化
    const handleRefreshStateChange = (refreshing: boolean) => {
      setIsRefreshing(refreshing);
    };

    // 添加监听器
    tokenRefreshManager.addListener(handleRefreshStateChange);

    // 获取初始状态
    setIsRefreshing(tokenRefreshManager.isRefreshing);

    // 清理函数
    return () => {
      tokenRefreshManager.removeListener(handleRefreshStateChange);
    };
  }, []);

  return (
    <TokenRefreshContext.Provider value={{ isRefreshing }}>
      {children}
      <TokenRefreshOverlay show={isRefreshing} />
    </TokenRefreshContext.Provider>
  );
};