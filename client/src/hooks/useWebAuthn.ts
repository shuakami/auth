/**
 * WebAuthn Hook
 * 管理生物验证的状态和操作
 */
import { useState, useEffect, useCallback } from 'react';
import { WebAuthnService, WebAuthnCredential, WebAuthnSupport } from '@/services/webauthn';
import { useAuth } from '@/context/AuthContext';

interface WebAuthnState {
  // 支持检测
  browserSupported: boolean;
  platformSupported: boolean;
  canUse: boolean;
  
  // 用户状态
  userSupport: WebAuthnSupport | null;
  credentials: WebAuthnCredential[];
  
  // 操作状态
  isRegistering: boolean;
  isAuthenticating: boolean;
  isLoading: boolean;
  
  // 错误状态
  error: string | null;
}

export function useWebAuthn() {
  const { user, login } = useAuth();
  
  const [state, setState] = useState<WebAuthnState>({
    browserSupported: false,
    platformSupported: false,
    canUse: false,
    userSupport: null,
    credentials: [],
    isRegistering: false,
    isAuthenticating: false,
    isLoading: true,
    error: null,
  });

  // 检查浏览器支持
  const checkBrowserSupport = useCallback(async () => {
    try {
      const support = await WebAuthnService.checkSupport();
      setState(prev => ({
        ...prev,
        browserSupported: support.browserSupported,
        platformSupported: support.platformSupported,
        canUse: support.canUse,
      }));
    } catch (error) {
      console.error('[useWebAuthn] 检查浏览器支持失败:', error);
    }
  }, []);

  // 获取用户支持状态
  const fetchUserSupport = useCallback(async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const userSupport = await WebAuthnService.getBiometricSupport();
      setState(prev => ({
        ...prev,
        userSupport,
        credentials: userSupport.credentials,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  }, []);

  // 注册生物验证
  const registerBiometric = useCallback(async (credentialName?: string) => {
    // 先检查状态，不在 setState 回调里 throw
    if (!state.canUse || !user) {
      const error = new Error('生物验证不可用或用户未登录');
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
    
    setState(prev => ({ ...prev, isRegistering: true, error: null }));

    try {
      // 获取注册选项
      const options = await WebAuthnService.beginRegistration();
      
      // 完成注册
      const credential = await WebAuthnService.finishRegistration(options, credentialName);
      
      // 刷新用户支持状态
      await fetchUserSupport();
      
      setState(prev => ({ ...prev, isRegistering: false }));
      return credential;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isRegistering: false,
        error: error.message,
      }));
      throw error;
    }
  }, [state.canUse, user, fetchUserSupport]);

  // 生物验证登录
  const authenticateWithBiometric = useCallback(async (userId?: string) => {
    // 在函数内部进行检查
    setState(prev => {
      if (!prev.canUse) {
        throw new Error('生物验证不可用');
      }
      return { ...prev, isAuthenticating: true, error: null };
    });

    try {
      // 获取认证选项
      const options = await WebAuthnService.beginAuthentication(userId);
      
      // 完成认证
      const result = await WebAuthnService.finishAuthentication(options, userId);
      
      // 更新认证状态
      await login(result.user);
      
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        error: error.message,
      }));
      throw error;
    }
  }, [login]);

  // 更新凭据名称
  const updateCredentialName = useCallback(async (credentialId: string, newName: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await WebAuthnService.updateCredentialName(credentialId, newName);
      await fetchUserSupport(); // 刷新列表
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, [fetchUserSupport]);

  // 删除凭据
  const deleteCredential = useCallback(async (credentialId: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await WebAuthnService.deleteCredential(credentialId);
      await fetchUserSupport(); // 刷新列表
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, [fetchUserSupport]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 刷新数据
  const refresh = useCallback(() => {
    fetchUserSupport();
  }, [fetchUserSupport]);

  // 初始化
  useEffect(() => {
    checkBrowserSupport();
  }, [checkBrowserSupport]);

  // 用户变化时获取支持状态
  useEffect(() => {
    if (user) {
      fetchUserSupport();
    } else {
      setState(prev => ({
        ...prev,
        userSupport: null,
        credentials: [],
        isLoading: false,
      }));
    }
  }, [user, fetchUserSupport]);

  return {
    // 状态
    ...state,
    
    // 计算属性
    isEnabled: state.userSupport?.enabled || false,
    hasCredentials: state.credentials.length > 0,
    
    // 操作方法
    registerBiometric,
    authenticateWithBiometric,
    updateCredentialName,
    deleteCredential,
    
    // 工具方法
    clearError,
    refresh,
  };
}

export default useWebAuthn;