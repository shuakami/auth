import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS, ERROR_MESSAGES } from '@/constants/auth';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/services/api';

interface UseOAuthProps {
  onError: (error: string) => void;
}

export const useOAuth = ({ onError }: UseOAuthProps) => {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();

  // 使用临时token进行OAuth成功处理
  const handleOAuthSuccessWithToken = useCallback(async (tempToken: string) => {
    try {
      console.log('[useOAuth] 收到临时token，开始交换正式cookie');
      
      const response = await apiClient.post('/exchange-token', { tempToken });

      if (response.status !== 200) {
        throw new Error(response.data.error || 'Token交换失败');
      }

      const result = response.data;

      // 交换成功后，直接用返回的用户信息登录，不再二次请求/me
      if (result.user) {
        login(result.user); // 使用AuthContext的login函数更新全局状态

        if (result.returnUrl) {
          console.log('[useOAuth] OAuth成功，从后端获取到returnUrl:', result.returnUrl);
          window.location.href = result.returnUrl;
        } else {
          router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
          console.log('[useOAuth] OAuth成功，后端未返回returnUrl，跳转到dashboard');
        }
      } else {
        // 如果后端在成功时不返回user，这是一个严重问题
        throw new Error('Token交换成功但后端未返回用户信息');
      }
    } catch (error: any) {
      console.error('[useOAuth] OAuth token交换或登录失败:', error);
      const errorMessage = error.response?.data?.error || error.message || 'OAuth登录失败';
      onError(errorMessage);
    }
  }, [login, router, onError]);

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
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleOAuthSuccessWithToken, onError]);

  // 打开 OAuth 弹窗
  const openOAuthPopup = useCallback((provider: 'github' | 'google') => {
    const returnUrl = searchParams.get('returnUrl');
    let url = provider === 'github' 
      ? AUTH_CONSTANTS.ROUTES.GITHUB_OAUTH 
      : AUTH_CONSTANTS.ROUTES.GOOGLE_OAUTH;
    
    if (returnUrl) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}returnUrl=${encodeURIComponent(returnUrl)}`;
    }
    
    const windowName = `${provider}_oauth`;
    const features = `width=${AUTH_CONSTANTS.OAUTH_WINDOW.WIDTH},height=${AUTH_CONSTANTS.OAUTH_WINDOW.HEIGHT}`;
    
    window.open(url, windowName, features);
  }, [searchParams]);

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