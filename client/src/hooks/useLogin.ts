import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login, verify2FA } from '@/services/api';
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
  const { checkAuth } = useAuth();
  
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
    setTwoFAState(prev => ({ 
      ...prev, 
      code: '', 
      message: '', 
      messageType: 'error' 
    }));
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    const loggedInUser = await checkAuth();
    if (loggedInUser) {
      // 检查是否有 returnUrl 参数
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      
      if (returnUrl) {
        // 如果有 returnUrl，重定向到该URL
        console.log('[useLogin] Login success, redirecting to returnUrl:', returnUrl);
        window.location.href = returnUrl;
      } else {
        // 默认重定向到 dashboard
        router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
        console.log('[useLogin] Login success, user found. Initiating navigation towards /dashboard.');
      }
    } else {
      setError(ERROR_MESSAGES.LOGIN_SUCCESS_NO_USER);
    }
  }, [checkAuth, router, setError]);

  const handleLoginSubmit = useCallback(async () => {
    setLoginState(prev => ({ ...prev, loading: true, error: '' }));
    setTwoFAState(prev => ({ ...prev, message: '' }));

    try {
      const resp = await login(loginState.email, loginState.password);
      
      if (resp.data?.error === 'TOTP_REQUIRED') {
        setLoginState(prev => ({ ...prev, show2fa: true }));
      } else {
        await handleLoginSuccess();
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
      await verify2FA({
        token: loginState.email, // 临时用email字段传递token
        totp: twoFAState.mode === 'totp' ? twoFAState.code : undefined,
        backupCode: twoFAState.mode === 'backup' ? twoFAState.code : undefined,
      });

      setTwoFAState(prev => ({
        ...prev,
        message: SUCCESS_MESSAGES.TWO_FA_VERIFICATION_SUCCESS,
        messageType: 'info'
      }));
      await handleLoginSuccess();

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || ERROR_MESSAGES.TWO_FA_ERROR;
      setTwoFAState(prev => ({ ...prev, loading: false, message: errorMessage }));
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