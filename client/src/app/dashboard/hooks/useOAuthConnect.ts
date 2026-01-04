/**
 * OAuth 连接 Hook
 * 处理第三方账号绑定逻辑
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

type OAuthProvider = 'github' | 'google';

interface UseOAuthConnectReturn {
  bindGithub: () => void;
  bindGoogle: () => void;
  isGithubLinked: boolean;
  isGoogleLinked: boolean;
}

export function useOAuthConnect(): UseOAuthConnectReturn {
  const { user, checkAuth } = useAuth();
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
        popupCheckInterval.current = null;
      }
    };
  }, []);

  // 监控弹窗关闭
  const monitorPopup = useCallback((popup: Window | null) => {
    if (!popup) return;
    
    if (popupCheckInterval.current) {
      clearInterval(popupCheckInterval.current);
    }
    
    popupCheckInterval.current = setInterval(() => {
      if (!popup || popup.closed) {
        if (popupCheckInterval.current) {
          clearInterval(popupCheckInterval.current);
          popupCheckInterval.current = null;
        }
        // 弹窗关闭后刷新用户状态
        checkAuth();
      }
    }, 1000);
  }, [checkAuth]);

  // 绑定 GitHub
  const bindGithub = useCallback(() => {
    const popup = window.open('/api/github', 'github_oauth', 'width=1000,height=700');
    monitorPopup(popup);
  }, [monitorPopup]);

  // 绑定 Google
  const bindGoogle = useCallback(() => {
    const popup = window.open('/api/google', 'google_oauth', 'width=1000,height=700');
    monitorPopup(popup);
  }, [monitorPopup]);

  return {
    bindGithub,
    bindGoogle,
    isGithubLinked: !!user?.github_id,
    isGoogleLinked: !!user?.google_id,
  };
}
