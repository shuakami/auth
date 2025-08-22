import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { AUTH_CONSTANTS, ERROR_MESSAGES, type TwoFAMode } from '@/constants/auth';
import { useOAuth } from './useOAuth';

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
      
      // 需要2FA验证
      if (resp.status === 206 || resp.data?.error === 'TOTP_REQUIRED') {
        setLoginState(prev => ({ ...prev, show2fa: true }));
        setTwoFAState(prev => ({ 
          ...prev, 
          code: '', 
          mode: 'totp',
          message: '',
          messageType: 'error'
        }));
      } else if (resp.status >= 400 || resp.data?.error) {
        // 处理登录错误
        const errMsg = resp.data?.message || resp.data?.error || ERROR_MESSAGES.LOGIN_FAILED;
        if (resp.data?.error === 'email_not_verified') {
          setError(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
        } else {
          setError(errMsg);
        }
      } else {
        // 登录成功
        await handleLoginSuccess();
      }
    } catch (err: unknown) {
      console.error('[useLogin] 登录过程出错:', err);
      let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
      
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string; error?: string }; status?: number } }).response;
        if (response?.data?.error === 'email_not_verified') {
          errorMessage = ERROR_MESSAGES.EMAIL_NOT_VERIFIED;
        } else if (response?.status === 401 && response?.data?.error === 'Invalid credentials') {
          errorMessage = ERROR_MESSAGES.INVALID_CREDENTIALS;
        } else if (response?.data?.message || response?.data?.error) {
          errorMessage = response.data.message || response.data.error || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setLoginState(prev => ({ ...prev, loading: false }));
    }
  }, [loginState.email, loginState.password, setError, handleLoginSuccess]);

  const handle2FASubmit = useCallback(async () => {
    setTwoFAState(prev => ({ ...prev, loading: true, message: '', messageType: 'error' }));

    try {
      const credentials: LoginCredentials = twoFAState.mode === 'totp' 
        ? { token: twoFAState.code } 
        : { backupCode: twoFAState.code };
      
      const resp = await login(loginState.email, loginState.password, credentials);

      if (resp.status === 200) {
        // 2FA验证成功
        setTwoFAState(prev => ({ 
          ...prev, 
          message: '验证成功，正在登录...', 
          messageType: 'info' 
        }));
        setLoginState(prev => ({ ...prev, show2fa: false }));
        
        const loggedInUser = await checkAuth();
        if (loggedInUser) {
          router.push(AUTH_CONSTANTS.ROUTES.DASHBOARD);
          console.log('[useLogin] 2FA success, user found. Initiating navigation towards /dashboard.');
        } else {
          setError(ERROR_MESSAGES.TWO_FA_SUCCESS_NO_USER);
        }
      } else {
        // 2FA验证失败
        const errorMsg = resp.data?.error || 
          (twoFAState.mode === 'totp' ? ERROR_MESSAGES.TOTP_INVALID : ERROR_MESSAGES.BACKUP_CODE_INVALID);
        setTwoFAState(prev => ({ ...prev, message: errorMsg }));
      }
    } catch (err: unknown) {
      console.error('[useLogin] 2FA 验证出错:', err);
      let errorMessage = ERROR_MESSAGES.TWO_FA_ERROR;
      
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error && typeof response.data.error === 'string') {
          errorMessage = response.data.error;
        }
      }
      setTwoFAState(prev => ({ ...prev, message: errorMessage }));
    } finally {
      setTwoFAState(prev => ({ ...prev, loading: false }));
    }
  }, [
    loginState.email, 
    loginState.password, 
    twoFAState.code, 
    twoFAState.mode, 
    checkAuth, 
    router, 
    setError
  ]);

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