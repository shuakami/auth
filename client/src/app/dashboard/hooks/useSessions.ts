/**
 * Sessions Hook
 * 管理会话列表和撤销操作
 */

import { useState, useEffect, useCallback } from 'react';
import { getSessions, revokeSession } from '@/services/api';

// API 返回的会话结构
interface ApiSession {
  id: string;
  device_info: string;
  created_at: string;
  last_used_at?: string;
  expires_at: string;
  firstLoginAt?: string;
  lastLoginAt?: string;
  lastLocation?: { 
    country?: string; 
    region?: string; 
    city?: string;
    lat?: number;
    lng?: number;
    timezone?: string;
  };
  lastIp?: string;
  isCurrent?: boolean;
}

// 转换后的会话结构（用于 UI）
export interface Session {
  id: string;
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
  deviceInfo: string;
  browser: string;
  os: string;
}

// 解析 User-Agent
function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = 'Unknown', os = 'Unknown';
  if (!ua) return { browser, os };
  
  const browserMatch = ua.match(/(Firefox|Chrome|Safari|Edge|MSIE|Trident|Opera)/i);
  if (browserMatch) browser = browserMatch[1];
  
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';
  
  return { browser, os };
}

// 格式化日期
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

// 转换 API 会话到 UI 会话
function transformSession(apiSession: ApiSession): Session {
  const { browser, os } = parseUserAgent(apiSession.device_info);
  const location = apiSession.lastLocation || {};
  
  return {
    id: apiSession.id,
    city: location.city || 'Unknown',
    region: location.region || '',
    country: location.country || 'Unknown',
    lat: location.lat || 0,
    lng: location.lng || 0,
    ip: apiSession.lastIp || 'Unknown',
    timezone: location.timezone || 'Unknown',
    createdAt: formatDate(apiSession.firstLoginAt || apiSession.created_at),
    expiresAt: formatDate(apiSession.expires_at),
    isCurrent: apiSession.isCurrent || false,
    deviceInfo: apiSession.device_info,
    browser,
    os,
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取会话列表
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSessions();
      const apiSessions: ApiSession[] = response.data.sessions || [];
      const transformed = apiSessions.map(transformSession);
      
      // 当前会话排在最前面
      transformed.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return 0;
      });
      
      setSessions(transformed);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 撤销会话
  const revokeSessionById = useCallback(async (sessionId: string): Promise<void> => {
    setIsRevoking(true);
    try {
      await revokeSession(sessionId);
      // 从列表中移除
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } finally {
      setIsRevoking(false);
    }
  }, []);

  // 撤销所有其他会话
  const revokeAllOtherSessions = useCallback(async (): Promise<void> => {
    setIsRevoking(true);
    try {
      const otherSessions = sessions.filter(s => !s.isCurrent);
      await Promise.all(otherSessions.map(s => revokeSession(s.id)));
      // 只保留当前会话
      setSessions(prev => prev.filter(s => s.isCurrent));
    } finally {
      setIsRevoking(false);
    }
  }, [sessions]);

  // 初始化加载
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 获取当前会话
  const currentSession = sessions.find(s => s.isCurrent) || sessions[0] || null;

  return {
    sessions,
    currentSession,
    isLoading,
    isRevoking,
    error,
    fetchSessions,
    revokeSessionById,
    revokeAllOtherSessions,
  };
}
