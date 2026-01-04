/**
 * Dashboard 类型定义
 * 包含所有页面相关的类型接口
 */

// 用户连接方式
export interface UserConnections {
  email: { enabled: boolean };
  twitter: { enabled: boolean; username?: string };
  google: { enabled: boolean };
  apple: { enabled: boolean };
  github?: { enabled: boolean }; // 扩展支持 GitHub
}

// 当前用户信息
export interface CurrentUser {
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
  connections: UserConnections;
}

// 系统用户
export interface SystemUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  createdAt: string;
  providers: ('github' | 'google')[];
}

// OAuth 应用
export interface OAuthApp {
  id: number;
  name: string;
  type: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
  usageCount: number;
  scopes: string;
  createdAt: string;
  description: string;
}

// 会话信息
export interface Session {
  id: number;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  ip: string;
  timezone: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

// 导航项
export interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

// Tab 类型
export type TabType = 'account' | 'security' | 'sessions' | 'user' | 'oauth';

// MFA 视图类型
export type MfaViewType = 'main' | 'select' | 'app' | 'key';

// OAuth 视图类型
export type OAuthViewType = 'list' | 'create' | 'success';

// 登录方式类型
export type SignInMethodType = 'Email and password' | '𝕏' | 'Google' | 'Apple' | null;

// OAuth 凭证
export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}
