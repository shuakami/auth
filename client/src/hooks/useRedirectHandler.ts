import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSafeRedirectUri } from '@/lib/url-utils'; // 导入共享的安全检查函数

// 非 HttpOnly Cookie 的名称
const CLIENT_REDIRECT_COOKIE_NAME = 'client_redirect_target';

/**
 * 处理客户端重定向的 Hook。
 * 在认证状态加载完成后检查 'client_redirect_target' Cookie。
 * 如果 Cookie 存在且包含一个安全的 URL，则执行重定向并删除 Cookie。
 * 返回一个布尔值 `isRedirecting`，指示是否正在尝试/执行重定向。
 */
export function useRedirectHandler(): { isRedirecting: boolean } {
  const { user, initialLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false); // 添加状态

  useEffect(() => {
    // 身份验证加载时重置状态
    if (initialLoading) {
      setIsRedirecting(false); 
      return;
    }

    // 仅在身份验证加载完成后继续
    if (!initialLoading) {
      console.log(`[useRedirectHandler] Auth loaded. User: ${user ? user.id : 'null'}`);
      const cookieValueRaw = document.cookie
        .split('; ')
        .find(row => row.startsWith(CLIENT_REDIRECT_COOKIE_NAME + '='))
        ?.split('=')[1];

      if (cookieValueRaw) {
        // 发现 Cookie，标记正在检查/准备重定向
        setIsRedirecting(true);
        
        let decodedUri = '';
        try {
          decodedUri = decodeURIComponent(cookieValueRaw);
          console.log(`[useRedirectHandler] Found ${CLIENT_REDIRECT_COOKIE_NAME} cookie. Decoded value:`, decodedUri);
        } catch (e) {
          console.error(`[useRedirectHandler] Failed to decode cookie ${CLIENT_REDIRECT_COOKIE_NAME}:`, cookieValueRaw, e);
          document.cookie = `${CLIENT_REDIRECT_COOKIE_NAME}=; path=/; max-age=-1; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
          setIsRedirecting(false); // 解码失败，不重定向
          return;
        }

        if (isSafeRedirectUri(decodedUri)) {
          console.log('[useRedirectHandler] Cookie value is safe. Redirecting...');
          document.cookie = `${CLIENT_REDIRECT_COOKIE_NAME}=; path=/; max-age=-1; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
          // 执行重定向，状态已设为 true
          window.location.replace(decodedUri);
          // 跳转发生后，此组件实例理论上会被销毁，无需重置 isRedirecting
        } else {
          console.warn('[useRedirectHandler] Cookie value is unsafe or invalid. Ignoring and deleting cookie.', decodedUri);
          document.cookie = `${CLIENT_REDIRECT_COOKIE_NAME}=; path=/; max-age=-1; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
          setIsRedirecting(false); // 不安全，不重定向
        }
      } else {
        console.log(`[useRedirectHandler] No ${CLIENT_REDIRECT_COOKIE_NAME} cookie found.`);
        setIsRedirecting(false); // 没有 Cookie，不重定向
      }
    }
    // 依赖 isLoading 和 user，确保状态更新时重新检查
  }, [initialLoading, user]);

  // 返回重定向状态
  return { isRedirecting };
} 