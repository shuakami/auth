'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // 使用 initialLoading 控制首次加载，避免在背景检查时显示加载指示器
  const { user, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 等待初始加载完成
    if (initialLoading) {
      return;
    }

    // 加载完成，但用户不存在 (null)，则重定向到登录
    if (!user) {
      console.log('ProtectedRoute: User not found after loading, redirecting to login.');
      router.push('/login');
    }
    // 如果 user 存在，则什么都不做
  }, [user, initialLoading, router]); // 依赖 user 和 initialLoading

  // 正在初始加载时显示加载组件
  if (initialLoading) {
    return <LoadingIndicator />;
  }

  // 初始加载完成且用户存在，渲染子组件
  // 如果用户不存在，useEffect 已经处理重定向，返回 null 避免渲染内容
  return user ? <>{children}</> : null;
};

export default ProtectedRoute; 