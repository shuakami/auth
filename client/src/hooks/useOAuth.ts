import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS, ERROR_MESSAGES } from '@/constants/auth';
import { useSearchParams } from 'next/navigation';

interface UseOAuthProps {
  onError: (error: string) => void;
}

export const useOAuth = ({ onError }: UseOAuthProps) => {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const searchParams = useSearchParams();

  // 使用临时token进行OAuth成功处理
  const handleOAuthSuccessWithToken = useCallback(async (tempToken: string) => {
    try {
      console.log('[useOAuth] 收到临时token，开始交换正式cookie');
      
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

      const result = await response.json();
      console.log('[useOAuth] Token交换成功，响应:', result);

      // 等待一小段时间让cookie设置生效
      await new Promise(resolve => setTimeout(resolve, 100));

      // 交换成功后，重试多次检查认证状态
      let user = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !user) {
        retryCount++;
        console.log(`[useOAuth] 尝试检查认证状态 (第${retryCount}次)`);
        
        try {
          user = await checkAuth();
          if (user) {
            console.log('[useOAuth] 认证状态检查成功，用户:', user.id);
            break;
          }
        } catch (error) {
          console.warn(`[useOAuth] 第${retryCount}次认证检查失败:`, error);
        }
        
        if (retryCount < maxRetries) {
          // 等待500ms再重试
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (user) {
        // 认证成功，进行跳转
        if (result.returnUrl) {
          console.log('[useOAuth] OAuth成功，从后端获取到returnUrl:', result.returnUrl);
          window.location.href = result.returnUrl;
        } else {
          console.log('[useOAuth] OAuth成功，后端未返回returnUrl，跳转到dashboard');
          router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
        }
      } else {
        // 最后尝试：直接刷新页面，让系统重新初始化
        console.warn('[useOAuth] 多次重试后仍无法获取用户信息，刷新页面');
        if (result.returnUrl) {
          window.location.href = result.returnUrl;
        } else {
          window.location.href = AUTH_CONSTANTS.ROUTES.DASHBOARD;
        }
      }
    } catch (error: any) {
      console.error('[useOAuth] OAuth token交换失败:', error);
      onError(error.message || 'OAuth登录失败');
    }
  }, [checkAuth, router, onError]);

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