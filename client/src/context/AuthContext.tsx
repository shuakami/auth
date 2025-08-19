'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { fetchCurrentUser } from '@/services/api';
import { logout as logoutApi } from '@/services/api';

// 定义用户类型 (与 /me 接口返回的 user 对象对应)
interface User {
  id: string;
  email: string;
  username: string | null;
  verified: boolean;
  totp_enabled: boolean;
  github_id: string | null;
  google_id: string | null;
  password_hash: string | null;
  has_password: boolean;
}

// 定义 AuthContext 的类型
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // 将被替换为 initialLoading
  initialLoading: boolean; // 新增：用于初始加载
  isCheckingAuth: boolean; // 新增：用于背景检查
  login: (userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<User | null>;
}

// 创建 AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 创建 AuthProvider 组件
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true); // 初始加载状态
  const [isCheckingAuth, setIsCheckingAuth] = useState(false); // 背景检查状态

  const checkAuth = async (): Promise<User | null> => { // 添加函数返回值类型
    // 只有在没有进行其他检查时才开始
    if (isCheckingAuth) return user;
    
    setIsCheckingAuth(true);
    let currentUser: User | null = null; // 用于存储本次检查结果
    try {
      const response = await fetchCurrentUser();
      if (response.data.user) {
        currentUser = response.data.user;
        setUser(currentUser); // 更新状态
      } else {
        setUser(null); // 更新状态
      }
    } catch (error) {
      // 获取用户信息失败，检查是否是 401 (未授权)
      // @ts-expect-error - 检查 Axios 错误结构
      if (error.response && error.response.status === 401) {
        // 401 是预期情况（用户未登录），静默处理
        console.log('User not authenticated (401).'); // 可以选择性地打印普通日志
        setUser(null);
      } else {
        // 对于其他错误（如网络错误、服务器 500 等），打印错误
        console.error('Check auth failed with unexpected error:', error);
        setUser(null); // 同样视为未登录
      }
      currentUser = null; // 确保出错时返回 null
    } finally {
      // 首次加载完成后，更新 initialLoading
      if (initialLoading) {
        setInitialLoading(false);
      }
      setIsCheckingAuth(false);
    }
    return currentUser; // 返回本次检查的结果
  };

  // 组件加载时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      // 即使失败也强制清理本地状态
      console.error('Logout API failed:', e);
    }
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading: initialLoading, // 保持 isLoading 的向后兼容性
      initialLoading,
      isCheckingAuth,
      login, 
      logout, 
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 创建自定义 Hook 以方便使用 AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};