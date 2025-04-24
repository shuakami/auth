'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // 直接获取 user 对象进行判断
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 等待加载完成
    if (isLoading) {
      return;
    }

    // 加载完成，但用户不存在 (null)，则重定向到登录
    if (!user) {
      console.log('ProtectedRoute: User not found after loading, redirecting to login.');
      router.push('/login');
    }
    // 如果 user 存在，则什么都不做
  }, [user, isLoading, router]); // 依赖 user 和 isLoading

  // 正在加载时显示新的加载组件
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // 加载完成且用户存在，渲染子组件
  // 如果用户不存在，useEffect 已经处理重定向，返回 null 避免渲染内容
  return user ? <>{children}</> : null;
};

export default ProtectedRoute; 