/**
 * 导航配置
 */

import { User, Lock, Globe, KeySquare } from 'lucide-react';
import type { NavItem } from '../types';

// 主导航项
export const navItems: NavItem[] = [
  { id: 'account', label: 'Account', icon: User, href: '/dashboard' },
  { id: 'security', label: 'Security', icon: Lock, href: '/dashboard/security' },
  { id: 'sessions', label: 'Sessions', icon: Globe, href: '/dashboard/sessions' },
  { id: 'user', label: 'User', icon: User, href: '/dashboard/user' },
  { id: 'oauth', label: 'OAuth', icon: KeySquare, href: '/dashboard/oauth' },
];

// OAuth 权限范围配置
export const oauthScopes = [
  { id: 'openid', label: 'OpenID Connect', description: '基本身份认证', required: true },
  { id: 'profile', label: '基本资料', description: '用户名、头像', required: false },
  { id: 'email', label: '邮箱地址', description: '用户的邮箱地址', required: false },
  { id: 'phone', label: '手机号码', description: '用户的手机号码', required: false },
  { id: 'address', label: '地址信息', description: '用户的地址信息', required: false },
  { id: 'offline_access', label: '离线访问', description: '发放Refresh Token', required: false },
] as const;
