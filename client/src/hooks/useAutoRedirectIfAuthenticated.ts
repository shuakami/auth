import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function useAutoRedirectIfAuthenticated() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[useAutoRedirectIfAuthenticated] 状态:', { user, isLoading });

    if (!isLoading && user) {
      console.log('[useAutoRedirectIfAuthenticated] 已登录，尝试导航到 dashboard (Middleware会处理重定向).');
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);
} 