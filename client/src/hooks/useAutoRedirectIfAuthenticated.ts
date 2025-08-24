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
      // 如果用户已登录，则根据 returnUrl 决定重定向目标
      if (user) {
        const returnUrl = searchParams.get('returnUrl');
        
        if (returnUrl) {
          console.log(`[AutoRedirect] User is authenticated. Redirecting to returnUrl: ${returnUrl}`);
          // 使用 replace 以避免用户可以通过“后退”按钮回到登录页
          router.replace(returnUrl);
        } else {
          console.log('[AutoRedirect] User is authenticated and no returnUrl is present. Redirecting to dashboard.');
          router.replace(AUTH_CONSTANTS.ROUTES.DASHBOARD);
        }
      }
    }
  }, [user, initialLoading, router, searchParams]);
} 