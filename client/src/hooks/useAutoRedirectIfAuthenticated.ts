import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function useAutoRedirectIfAuthenticated() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[useAutoRedirectIfAuthenticated] 状态:', { user, isLoading });

    if (!isLoading && user) {
      // 检查是否有 returnUrl 参数
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      
      if (returnUrl) {
        // 如果有 returnUrl，重定向到该URL
        console.log('[useAutoRedirectIfAuthenticated] 已登录，重定向到 returnUrl:', returnUrl);
        window.location.href = returnUrl;
      } else {
        // 默认重定向到 dashboard
        console.log('[useAutoRedirectIfAuthenticated] 已登录，尝试导航到 dashboard (Middleware会处理重定向).');
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);
} 