'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import { fetchCurrentUser } from '@/services/api';
import { logout as logoutApi, setLoggingOut } from '@/services/api';
import { tokenManager } from '@/services/EnhancedTokenManager';

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
  const isLoggingOutRef = useRef(false); // 跟踪登出状态

  const checkAuth = async (): Promise<User | null> => { // 添加函数返回值类型
    // 如果正在登出，不要进行认证检查
    if (isLoggingOutRef.current) {
      console.log('[AuthContext] 正在登出过程中，跳过认证检查');
      return null;
    }
    
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
      // 再次检查是否在登出过程中
      if (isLoggingOutRef.current) {
        console.log('[AuthContext] 在检查过程中开始登出，停止处理');
        setUser(null);
        currentUser = null;
      } else {
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
      }
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
    // 检查是否有有效的cookie再决定是否检查认证
    const hasTokenCookie = typeof document !== 'undefined' && 
                          (document.cookie.includes('accessToken=') || 
                           document.cookie.includes('refreshToken='));
    
    if (hasTokenCookie && !isLoggingOutRef.current) {
      console.log('[AuthContext] 检测到token cookie，开始认证检查');
      checkAuth();
    } else {
      console.log('[AuthContext] 没有token cookie或正在登出，跳过初始认证检查');
      setInitialLoading(false);
    }
  }, []);

  const login = (userData: User) => {
    // 清除登出状态
    isLoggingOutRef.current = false;
    setLoggingOut(false);
    
    setUser(userData);
    // 重新启动token自动刷新机制
    tokenManager.restartAutoRefresh();
  };

  const logout = async () => {
    // 立即标记为登出状态，阻止任何认证检查
    isLoggingOutRef.current = true;
    setLoggingOut(true);
    
    try {
      // 停止token自动刷新，防止退登后被自动重新登录
      tokenManager.stopAutoRefresh();
      
      // 立即清理本地用户状态
      setUser(null);
      
      // 调用登出API
      await logoutApi();
    } catch (e) {
      // 即使API失败也要完成本地清理
      console.error('Logout API failed:', e);
    } finally {
      // 无论如何都要跳转到登录页
      window.location.href = '/login';
    }
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