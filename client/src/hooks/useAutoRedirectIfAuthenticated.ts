import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS } from '@/constants/auth';

export default function useAutoRedirectIfAuthenticated() {
  const { user, initialLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 只有在身份验证加载完成后再执行
    if (!initialLoading) {
      // 如果用户已登录，并且当前不是特殊的OAuth流程，则重定向
      const hasReturnUrl = searchParams.has('returnUrl');
      
      if (user && !hasReturnUrl) {
        console.log('[AutoRedirect] User is authenticated and no returnUrl is present. Redirecting to dashboard.');
        router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
      }
    }
  }, [user, initialLoading, router, searchParams]);
} 