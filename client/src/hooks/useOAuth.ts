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
    // 添加延迟和重试机制，解决cookie设置时间延迟问题
    let user = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      // 短暂延迟，让cookie有时间设置
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      user = await checkAuth();
      if (user) break;
      
      attempts++;
      console.log(`[useOAuth] OAuth auth check attempt ${attempts}/${maxAttempts}`);
    }
    
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
      console.error('[useOAuth] Failed to authenticate after OAuth success, attempts:', attempts);
      onError(ERROR_MESSAGES.OAUTH_SUCCESS_NO_USER);
    }
  }, [checkAuth, router, onError]);

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

      // 交换成功后，检查认证状态
      const user = await checkAuth();
      if (user) {
        // 检查是否有 returnUrl 参数
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnUrl');
        
        if (returnUrl) {
          console.log('[useOAuth] OAuth成功，重定向到returnUrl:', returnUrl);
          window.location.href = returnUrl;
        } else {
          router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
          console.log('[useOAuth] OAuth成功，重定向到dashboard');
        }
      } else {
        throw new Error('Token交换成功但无法获取用户信息');
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
      // 兼容旧的消息格式
      else if (typeof data === 'string') {
        const oauthMessages = Object.values(AUTH_CONSTANTS.OAUTH_MESSAGES);
        if (oauthMessages.includes(data as any)) {
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