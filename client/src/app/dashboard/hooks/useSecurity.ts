/**
 * Security Hook
 * 管理 2FA、备份码等安全相关操作
 */

import { useState, useCallback, useEffect } from 'react';
import {
  setup2FA,
  verify2FA,
  disable2FA,
  generateBackupCodes,
  getRemainingBackupCodes,
  updatePassword,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface Setup2FAData {
  qr: string;
  secret: string;
  backupCodes: string[];
}

export function useSecurity() {
  const { user, checkAuth } = useAuth();
  
  // 2FA 状态
  const [setup2FAData, setSetup2FAData] = useState<Setup2FAData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [remainingBackupCount, setRemainingBackupCount] = useState<number | null>(null);
  
  // Loading 状态
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [isGeneratingBackupCodes, setIsGeneratingBackupCodes] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 获取剩余备份码数量
  const fetchRemainingBackupCodes = useCallback(async () => {
    if (!user?.totp_enabled) {
      setRemainingBackupCount(null);
      return;
    }
    try {
      const res = await getRemainingBackupCodes();
      setRemainingBackupCount(res.data.count);
    } catch {
      // 静默失败
    }
  }, [user?.totp_enabled]);

  // 初始化获取备份码数量
  useEffect(() => {
    fetchRemainingBackupCodes();
  }, [fetchRemainingBackupCodes]);

  // 启用 2FA 第一步：获取 QR 码
  const initSetup2FA = useCallback(async (password: string): Promise<Setup2FAData> => {
    setIsSettingUp2FA(true);
    try {
      const res = await setup2FA(password);
      const data: Setup2FAData = {
        qr: res.data.qr,
        secret: res.data.secret,
        backupCodes: res.data.backupCodes,
      };
      setSetup2FAData(data);
      setBackupCodes(data.backupCodes);
      return data;
    } finally {
      setIsSettingUp2FA(false);
    }
  }, []);

  // 启用 2FA 第二步：验证 TOTP
  const confirmSetup2FA = useCallback(async (totp: string): Promise<void> => {
    if (!user?.email) throw new Error('用户未登录');
    setIsVerifying2FA(true);
    try {
      await verify2FA({ email: user.email, totp });
      await checkAuth();
      setSetup2FAData(null);
    } finally {
      setIsVerifying2FA(false);
    }
  }, [user?.email, checkAuth]);

  // 关闭 2FA
  const disableTwoFA = useCallback(async (data: { token?: string; backupCode?: string }): Promise<void> => {
    setIsDisabling2FA(true);
    try {
      await disable2FA(data);
      await checkAuth();
    } finally {
      setIsDisabling2FA(false);
    }
  }, [checkAuth]);

  // 生成新备份码
  const generateNewBackupCodes = useCallback(async (password: string): Promise<string[]> => {
    setIsGeneratingBackupCodes(true);
    try {
      const res = await generateBackupCodes(password);
      const codes = res.data.codes;
      setBackupCodes(codes);
      setRemainingBackupCount(codes.length);
      return codes;
    } finally {
      setIsGeneratingBackupCodes(false);
    }
  }, []);

  // 设置/修改密码
  const setPassword = useCallback(async (data: { oldPassword?: string; newPassword: string }): Promise<void> => {
    setIsUpdatingPassword(true);
    try {
      await updatePassword(data);
      await checkAuth();
    } finally {
      setIsUpdatingPassword(false);
    }
  }, [checkAuth]);

  // 清除 setup 数据
  const clearSetup2FAData = useCallback(() => {
    setSetup2FAData(null);
  }, []);

  return {
    // 状态
    setup2FAData,
    backupCodes,
    remainingBackupCount,
    is2FAEnabled: user?.totp_enabled ?? false,
    hasPassword: user?.has_password ?? false,
    
    // Loading 状态
    isSettingUp2FA,
    isVerifying2FA,
    isDisabling2FA,
    isGeneratingBackupCodes,
    isUpdatingPassword,
    
    // 操作
    initSetup2FA,
    confirmSetup2FA,
    disableTwoFA,
    generateNewBackupCodes,
    setPassword,
    clearSetup2FAData,
    fetchRemainingBackupCodes,
  };
}
