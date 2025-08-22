import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS, ERROR_MESSAGES } from '@/constants/auth';

interface UseOAuthProps {
  onError: (error: string) => void;
}

export const useOAuth = ({ onError }: UseOAuthProps) => {
  const router = useRouter();
  const { checkAuth } = useAuth();

  // OAuth 成功处理
  const handleOAuthSuccess = useCallback(async () => {
    const user = await checkAuth();
    if (user) {
      // 检查是否有 returnUrl 参数
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      
      if (returnUrl) {
        // 如果有 returnUrl，重定向到该URL
        console.log('[useOAuth] OAuth success, redirecting to returnUrl:', returnUrl);
        window.location.href = returnUrl;
      } else {
        // 默认重定向到 dashboard
        router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
        console.log('[useOAuth] OAuth success, user found. Initiating navigation towards /dashboard.');
      }
    } else {
      onError(ERROR_MESSAGES.OAUTH_SUCCESS_NO_USER);
    }
  }, [checkAuth, router, onError]);

  // OAuth 消息监听
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { data } = event;
      const oauthMessages = Object.values(AUTH_CONSTANTS.OAUTH_MESSAGES);
      
      if (oauthMessages.includes(data)) {
        handleOAuthSuccess();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleOAuthSuccess]);

  // 打开 OAuth 弹窗
  const openOAuthPopup = useCallback((provider: 'github' | 'google') => {
    const url = provider === 'github' 
      ? AUTH_CONSTANTS.ROUTES.GITHUB_OAUTH 
      : AUTH_CONSTANTS.ROUTES.GOOGLE_OAUTH;
    
    const windowName = `${provider}_oauth`;
    const features = `width=${AUTH_CONSTANTS.OAUTH_WINDOW.WIDTH},height=${AUTH_CONSTANTS.OAUTH_WINDOW.HEIGHT}`;
    
    window.open(url, windowName, features);
  }, []);

  // GitHub 登录
  const loginWithGitHub = useCallback(() => {
    openOAuthPopup('github');
  }, [openOAuthPopup]);

  // Google 登录
  const loginWithGoogle = useCallback(() => {
    openOAuthPopup('google');
  }, [openOAuthPopup]);

  return {
    loginWithGitHub,
    loginWithGoogle,
  };
};