import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * 已登录用户自动跳转 dashboard 的 Hook
 * 只需在页面组件内调用即可
 */
export default function useAutoRedirectIfAuthenticated() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[useAutoRedirectIfAuthenticated] 状态:', { user, isLoading });
    if (!isLoading && user) {
      console.log('[useAutoRedirectIfAuthenticated] 已登录，自动跳转 dashboard');
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);
} 