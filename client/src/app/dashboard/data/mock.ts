/**
 * Mock 数据
 * 用于开发和测试的模拟数据
 */

import type { CurrentUser, SystemUser, OAuthApp, Session } from '../types';

// 当前登录用户
export const mockUser: CurrentUser = {
  name: 'Shuakami',
  email: 'shuakami@sdjz.wiki',
  avatar: 'https://uapis.cn/api/v1/avatar/gravatar?s=64&d=identicon&r=g&email=shuakami%40sdjz.wiki',
  createdAt: 'Oct 30, 2024',
  connections: {
    email: { enabled: true },
    twitter: { enabled: true, username: 'miaokezi' },
    google: { enabled: false },
    apple: { enabled: false },
  }
};

// 系统用户列表
export const mockUsers: SystemUser[] = [
  { id: 1, username: 'BugPufferfish', email: '3784941209@qq.com', role: 'user', emailVerified: true, twoFactorEnabled: false, biometricEnabled: false, createdAt: '2025/10/19', providers: ['github'] },
  { id: 2, username: 'BXQbxqcheney', email: '264789647@qq.com', role: 'user', emailVerified: true, twoFactorEnabled: false, biometricEnabled: false, createdAt: '2025/10/17', providers: ['github'] },
  { id: 3, username: 'Nefertarrrri', email: '2079646357@qq.com', role: 'user', emailVerified: true, twoFactorEnabled: false, biometricEnabled: false, createdAt: '2025/09/28', providers: ['github'] },
  { id: 4, username: 'kjmw1343', email: 'chengxiqing87@gmail.com', role: 'user', emailVerified: true, twoFactorEnabled: false, biometricEnabled: false, createdAt: '2025/08/22', providers: ['google'] },
  { id: 5, username: 'tutucoolapk', email: 'tutucoolapk@qq.com', role: 'user', emailVerified: true, twoFactorEnabled: false, biometricEnabled: false, createdAt: '2025/08/22', providers: ['google'] },
  { id: 6, username: 'xiaoyueyoqwq', email: 'xiaoyueyoqwq@gmail.com', role: 'admin', emailVerified: true, twoFactorEnabled: false, biometricEnabled: false, createdAt: '2025/08/19', providers: ['github', 'google'] },
  { id: 7, username: 'Shuakami', email: 'shuakami@sdjz.wiki', role: 'super_admin', emailVerified: true, twoFactorEnabled: false, biometricEnabled: true, createdAt: '2025/08/19', providers: ['github'] },
];

// OAuth 应用列表
export const mockOAuthApps: OAuthApp[] = [
  { id: 1, name: 'Hakimi Panel', type: 'Web Application', clientId: '_____dbda4d1910094c8d', clientSecret: 'sk_test_************************', enabled: true, usageCount: 4, scopes: 'openid, profile, email, phone, offline_access, address', createdAt: '2025/9/26', description: '' },
  { id: 2, name: 'Ciallo～(∠・ω< )⌒★', type: 'Web Application', clientId: 'ciallo_____19251dc9eb0064e0', clientSecret: 'sk_test_************************', enabled: true, usageCount: 39, scopes: 'openid, profile, email, phone, offline_access, address', createdAt: '2025/9/17', description: '' },
  { id: 3, name: 'SakuraHaruna', type: 'Web Application', clientId: 'sakuraharu_0172e6630eb274ae', clientSecret: 'sk_test_************************', enabled: false, usageCount: 0, scopes: 'openid, profile, email, phone, offline_access, address', createdAt: '2025/9/16', description: '' },
  { id: 4, name: 'VAIIYA-Feedback', type: 'Web Application', clientId: 'vaiiya_fee_b80b8fe40a48176d', clientSecret: 'sk_test_************************', enabled: true, usageCount: 9, scopes: 'openid, profile, email, address, phone, offline_access', createdAt: '2025/8/23', description: 'VAIIYA email receipt system' },
  { id: 5, name: 'CoreMiao', type: 'Web Application', clientId: 'coremiao_90276c4d884fd54f', clientSecret: 'sk_test_************************', enabled: true, usageCount: 0, scopes: 'openid, profile, email, phone, address, offline_access', createdAt: '2025/8/22', description: 'Statistics and error handling system' },
  { id: 6, name: 'INFINITYCRAFT FORMS', type: 'Web Application', clientId: 'infinitycr_e1ea39bd8f2fb8cd', clientSecret: 'sk_test_************************', enabled: true, usageCount: 16, scopes: 'openid, email, profile, phone, offline_access, address', createdAt: '2025/8/19', description: 'INFINITYCRAFT FORMS form system' },
];

// 会话列表
export const mockSessions: Session[] = [
  { id: 1, city: 'Las Vegas', region: 'Nevada', country: 'United States', lat: 36.1699, lng: -115.1398, ip: '205.185.125.20', timezone: 'America/Los_Angeles (UTC-8)', createdAt: 'Sep 20, 2025', expiresAt: 'May 5, 2026', isCurrent: true },
  { id: 2, city: 'Tokyo', region: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, ip: '103.152.220.45', timezone: 'Asia/Tokyo (UTC+9)', createdAt: 'Sep 23, 2025', expiresAt: 'May 5, 2026', isCurrent: false },
  { id: 3, city: 'London', region: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, ip: '185.234.67.89', timezone: 'Europe/London (UTC+0)', createdAt: 'Sep 25, 2025', expiresAt: 'May 8, 2026', isCurrent: false },
  { id: 4, city: 'Singapore', region: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, ip: '128.199.45.123', timezone: 'Asia/Singapore (UTC+8)', createdAt: 'Sep 28, 2025', expiresAt: 'May 10, 2026', isCurrent: false },
];
