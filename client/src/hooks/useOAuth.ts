import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS, ERROR_MESSAGES } from '@/constants/auth';

interface UseOAuthProps {
  onError: (error: string) => void;
  onSuccess: () => void;
}

export const useOAuth = ({ onError, onSuccess }: UseOAuthProps) => {
  const router = useRouter();
  const { checkAuth } = useAuth();

  // 这个函数现在只用于旧的postMessage格式，作为后备
  const handleOAuthSuccess = useCallback(async () => {
    const user = await checkAuth();
    if (user) {
      onSuccess();
    } else {
      onError(ERROR_MESSAGES.OAUTH_SUCCESS_NO_USER);
    }
  }, [checkAuth, onSuccess, onError]);

  // 使用临时token进行OAuth成功处理
  const handleOAuthSuccessWithToken = useCallback(async (tempToken: string) => {
    try {
      console.log('[useOAuth] 收到临时token，开始交换正式cookie');
      
      // 调用新的API来交换临时token为正式cookie
      const response = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tempToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token交换失败');
      }

      // 交换成功后，调用通用的成功处理器
      onSuccess();

    } catch (error: any) {
      console.error('[useOAuth] OAuth token交换失败:', error);
      onError(error.message || 'OAuth登录失败');
    }
  }, [onSuccess, onError]);

  // OAuth 消息监听
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { data } = event;
      
      // 处理新的消息格式
      if (typeof data === 'object' && data.type) {
        if (data.type === 'github-login-success' || data.type === 'google-login-success') {
          if (data.tempToken) {
            handleOAuthSuccessWithToken(data.tempToken);
          } else {
            onError('OAuth登录成功但未收到临时token');
          }
        } else if (data.type === 'github-login-error' || data.type === 'google-login-error') {
          onError(data.error || 'OAuth登录失败');
        }
      }
      // 兼容旧的消息格式
      else if (typeof data === 'string') {
        const oauthMessages = Object.values(AUTH_CONSTANTS.OAUTH_MESSAGES);
        if ((oauthMessages as string[]).includes(data)) {
          handleOAuthSuccess();
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleOAuthSuccess, handleOAuthSuccessWithToken, onError]);

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