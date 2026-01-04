import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin, verify2FA as apiVerify2FA } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES, type TwoFAMode } from '@/constants/auth';

interface LoginCredentials {
  token?: string;
  backupCode?: string;
}

interface LoginState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  show2fa: boolean;
}

interface TwoFAState {
  mode: TwoFAMode;
  code: string;
  message: string;
  messageType: 'error' | 'info';
  loading: boolean;
}

export const useLogin = () => {
  const router = useRouter();
  const { login } = useAuth();
  
  const [loginState, setLoginState] = useState<LoginState>({
    email: '',
    password: '',
    error: '',
    loading: false,
    show2fa: false,
  });
  
  const [twoFAState, setTwoFAState] = useState<TwoFAState>({
    mode: 'totp',
    code: '',
    message: '',
    messageType: 'error',
    loading: false,
  });

  const setEmail = useCallback((email: string) => {
    setLoginState(prev => ({ ...prev, email }));
  }, []);

  const setPassword = useCallback((password: string) => {
    setLoginState(prev => ({ ...prev, password }));
  }, []);

  const setError = useCallback((error: string) => {
    setLoginState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setLoginState(prev => ({ ...prev, error: '' }));
  }, []);

  const set2FACode = useCallback((code: string) => {
    setTwoFAState(prev => ({ ...prev, code }));
  }, []);

  const set2FAMode = useCallback((mode: TwoFAMode) => {
    setTwoFAState(prev => ({ 
      ...prev, 
      mode, 
      code: '', 
      message: '', 
      messageType: 'error' 
    }));
  }, []);

  const toggle2FAMode = useCallback(() => {
    setTwoFAState(prev => ({
      ...prev,
      mode: prev.mode === 'totp' ? 'backup' : 'totp',
      code: '',
      message: '',
      messageType: 'error',
    }));
  }, []);

  const close2FA = useCallback(() => {
    setLoginState(prev => ({ ...prev, show2fa: false, error: '' }));
    setTwoFAState({ 
      mode: 'totp',
      code: '', 
      message: '', 
      messageType: 'error',
      loading: false,
    });
  }, []);

  const handleLoginSuccess = useCallback(async (user: any) => {
    // 1. 使用从API返回的用户信息直接登录
    login(user);

    // 2. 处理重定向
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');
    
    if (returnUrl) {
      console.log('[useLogin] Login success, redirecting to returnUrl:', returnUrl);
      window.location.href = returnUrl;
    } else {
      router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
      console.log('[useLogin] Login success, user found. Initiating navigation towards /dashboard.');
    }
  }, [login, router]);

  const handleLoginSubmit = useCallback(async () => {
    setLoginState(prev => ({ ...prev, loading: true, error: '' }));
    setTwoFAState(prev => ({ ...prev, message: '' }));

    try {
      const resp = await apiLogin(loginState.email, loginState.password);
      
      if (resp.status === 401 && resp.data?.error === 'TOTP_REQUIRED') {
        setLoginState(prev => ({ ...prev, show2fa: true }));
        return;
      }

      if (resp.status === 200 && resp.data.user) {
        await handleLoginSuccess(resp.data.user);
      } else {
        const errorMessage = resp.data?.error || ERROR_MESSAGES.LOGIN_FAILED;
        setError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || ERROR_MESSAGES.LOGIN_FAILED;
      setError(errorMessage);
    } finally {
      setLoginState(prev => ({ ...prev, loading: false }));
    }
  }, [loginState.email, loginState.password, handleLoginSuccess, setError]);

  const handle2FASubmit = useCallback(async () => {
    setTwoFAState(prev => ({ ...prev, loading: true, message: '', messageType: 'error' }));

    try {
      const resp = await apiVerify2FA({
        email: loginState.email,
        totp: twoFAState.mode === 'totp' ? twoFAState.code : undefined,
        backupCode: twoFAState.mode === 'backup' ? twoFAState.code : undefined,
      });

      if (resp.status === 200 && resp.data.user) {
        // 验证成功：先关闭模态框，再跳转（同时进行，体验更流畅）
        setLoginState(prev => ({ ...prev, show2fa: false }));
        await handleLoginSuccess(resp.data.user);
      } else {
        const errorMessage = resp.data?.error || ERROR_MESSAGES.TWO_FA_ERROR;
        setTwoFAState(prev => ({ ...prev, message: errorMessage, loading: false }));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || ERROR_MESSAGES.TWO_FA_ERROR;
      setTwoFAState(prev => ({ ...prev, message: errorMessage, loading: false }));
    }
  }, [loginState.email, twoFAState.mode, twoFAState.code, handleLoginSuccess]);

  return {
    // Login state
    email: loginState.email,
    password: loginState.password,
    error: loginState.error,
    loading: loginState.loading,
    show2fa: loginState.show2fa,
    
    // 2FA state
    twoFAMode: twoFAState.mode,
    twoFACode: twoFAState.code,
    twoFAMessage: twoFAState.message,
    twoFAMessageType: twoFAState.messageType,
    twoFALoading: twoFAState.loading,
    
    // Actions
    setEmail,
    setPassword,
    setError,
    clearError,
    set2FACode,
    set2FAMode,
    toggle2FAMode,
    close2FA,
    handleLoginSubmit,
    handle2FASubmit,
  };
};