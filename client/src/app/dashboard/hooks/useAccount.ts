/**
 * 账户管理 Hook
 * 处理用户账户相关的所有业务逻辑
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  updateUsername,
  updateEmail,
  updatePassword,
} from '@/services/api';
import type { CurrentUser, UserConnections } from '../types';

// API 错误提取
function getErrorMessage(err: unknown, fallback = '操作失败'): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const res = (err as { response?: { data?: { error?: string; message?: string } } }).response;
    if (res?.data?.error) return res.data.error;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// 表单状态类型
interface FormState {
  loading: boolean;
  error: string;
  success: string;
}

const initialFormState: FormState = {
  loading: false,
  error: '',
  success: '',
};

export interface UseAccountReturn {
  // 用户数据
  user: CurrentUser | null;
  isLoading: boolean;
  
  // 用户名
  usernameForm: FormState;
  updateUsernameFn: (newUsername: string) => Promise<boolean>;
  resetUsernameForm: () => void;
  
  // 邮箱
  emailForm: FormState;
  updateEmailFn: (newEmail: string, password: string) => Promise<boolean>;
  resetEmailForm: () => void;
  
  // 密码
  passwordForm: FormState;
  updatePasswordFn: (oldPassword: string | undefined, newPassword: string) => Promise<boolean>;
  resetPasswordForm: () => void;
  
  // 辅助
  hasPassword: boolean;
  isEmailVerified: boolean;
}

export function useAccount(): UseAccountReturn {
  const { user: authUser, isLoading: authLoading, checkAuth } = useAuth();
  
  // 表单状态
  const [usernameForm, setUsernameForm] = useState<FormState>(initialFormState);
  const [emailForm, setEmailForm] = useState<FormState>(initialFormState);
  const [passwordForm, setPasswordForm] = useState<FormState>(initialFormState);

  // 转换 authUser 为 CurrentUser 格式
  const user = useMemo<CurrentUser | null>(() => {
    if (!authUser) return null;
    
    const connections: UserConnections = {
      email: { enabled: !!authUser.has_password },
      twitter: { enabled: false }, // 暂不支持
      google: { enabled: !!authUser.google_id },
      apple: { enabled: false }, // 暂不支持
    };

    // 如果有 GitHub 绑定，添加到 connections（扩展类型）
    const extendedConnections = {
      ...connections,
      github: { enabled: !!authUser.github_id },
    };

    return {
      name: authUser.username || '',
      email: authUser.email,
      avatar: `https://uapis.cn/api/v1/avatar/gravatar?s=64&d=identicon&r=g&email=${encodeURIComponent(authUser.email)}`,
      createdAt: '', // API 未返回，可后续扩展
      connections: extendedConnections as UserConnections,
    };
  }, [authUser]);

  // 更新用户名
  const updateUsernameFn = useCallback(async (newUsername: string): Promise<boolean> => {
    setUsernameForm({ loading: true, error: '', success: '' });
    try {
      await updateUsername(newUsername);
      await checkAuth(); // 刷新用户数据
      setUsernameForm({ loading: false, error: '', success: '用户名更新成功' });
      return true;
    } catch (err) {
      setUsernameForm({ loading: false, error: getErrorMessage(err, '用户名更新失败'), success: '' });
      return false;
    }
  }, [checkAuth]);

  // 更新邮箱
  const updateEmailFn = useCallback(async (newEmail: string, password: string): Promise<boolean> => {
    setEmailForm({ loading: true, error: '', success: '' });
    try {
      const res = await updateEmail({ newEmail, password });
      await checkAuth();
      setEmailForm({ 
        loading: false, 
        error: '', 
        success: res.data?.message || '验证邮件已发送至新邮箱' 
      });
      return true;
    } catch (err) {
      setEmailForm({ loading: false, error: getErrorMessage(err, '邮箱更新失败'), success: '' });
      return false;
    }
  }, [checkAuth]);

  // 更新密码
  const updatePasswordFn = useCallback(async (
    oldPassword: string | undefined, 
    newPassword: string
  ): Promise<boolean> => {
    setPasswordForm({ loading: true, error: '', success: '' });
    try {
      await updatePassword(oldPassword ? { oldPassword, newPassword } : { newPassword });
      await checkAuth();
      setPasswordForm({ loading: false, error: '', success: '密码设置成功' });
      return true;
    } catch (err) {
      setPasswordForm({ loading: false, error: getErrorMessage(err, '密码设置失败'), success: '' });
      return false;
    }
  }, [checkAuth]);

  // 重置表单状态
  const resetUsernameForm = useCallback(() => setUsernameForm(initialFormState), []);
  const resetEmailForm = useCallback(() => setEmailForm(initialFormState), []);
  const resetPasswordForm = useCallback(() => setPasswordForm(initialFormState), []);

  return {
    user,
    isLoading: authLoading,
    usernameForm,
    updateUsernameFn,
    resetUsernameForm,
    emailForm,
    updateEmailFn,
    resetEmailForm,
    passwordForm,
    updatePasswordFn,
    resetPasswordForm,
    hasPassword: !!authUser?.has_password,
    isEmailVerified: !!authUser?.verified,
  };
}
