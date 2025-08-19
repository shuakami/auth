import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function useAutoRedirectIfAuthenticated() {
  const { isAuthenticated, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 等待初始加载完成
    if (initialLoading) {
      return;
    }

    // 初始加载完成后，如果用户已认证，则重定向到仪表盘
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, initialLoading, router]);
} 