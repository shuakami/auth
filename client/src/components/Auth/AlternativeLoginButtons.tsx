/**
 * 替代登录方式按钮组件
 * 集成OAuth登录和生物验证登录
 */
import { memo, useCallback, useState } from 'react';
import { Fingerprint, AlertCircle } from 'lucide-react';
import useWebAuthn from '@/hooks/useWebAuthn';

// 复用OAuth按钮的图标组件
const GithubIcon = memo(function GithubIcon() {
  return (
    <svg 
      className="mr-2 h-5 w-5" 
      fill="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 012.9-.39c.99.01 1.99.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z" />
    </svg>
  );
});

const GoogleIcon = memo(function GoogleIcon() {
  return (
    <svg 
      height="20" 
      viewBox="0 0 24 24" 
      width="20" 
      xmlns="http://www.w3.org/2000/svg" 
      style={{flex: '0 0 auto', lineHeight: 1}} 
      className="mr-2 h-5 w-5"
      aria-hidden="true"
    >
      <title>Google</title>
      <path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4" />
      <path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853" />
      <path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05" />
      <path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335" />
    </svg>
  );
});

const BiometricIcon = memo(function BiometricIcon() {
  return <Fingerprint className="mr-2 h-5 w-5" aria-hidden="true" />;
});

interface AlternativeLoginButtonsProps {
  onGitHubLogin: () => void;
  onGoogleLogin: () => void;
  onBiometricSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const AlternativeLoginButtons = memo(function AlternativeLoginButtons({ 
  onGitHubLogin, 
  onGoogleLogin, 
  onBiometricSuccess,
  onError,
  disabled = false 
}: AlternativeLoginButtonsProps) {
  const {
    canUse: biometricCanUse,
    platformSupported,
    isAuthenticating,
    error: biometricError,
    authenticateWithBiometric,
    clearError,
  } = useWebAuthn();

  const [localBiometricError, setLocalBiometricError] = useState<string | null>(null);

  // 统一的按钮样式
  const buttonBaseClasses = "inline-flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-300 dark:hover:bg-[#262626] dark:focus:ring-offset-[#09090b]";

  const handleBiometricLogin = useCallback(async () => {
    if (!biometricCanUse) return;

    try {
      setLocalBiometricError(null);
      clearError();
      
      const result = await authenticateWithBiometric();
      onBiometricSuccess?.(result);
    } catch (error: any) {
      const errorMsg = error.message || '生物验证失败';
      setLocalBiometricError(errorMsg);
      onError?.(errorMsg);
    }
  }, [biometricCanUse, authenticateWithBiometric, clearError, onBiometricSuccess, onError]);

  const currentBiometricError = localBiometricError || biometricError;

  return (
    <>
      {/* 分隔线 */}
      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-sm text-neutral-500 dark:bg-[#09090b] dark:text-neutral-400">
            或使用
          </span>
        </div>
      </div>

      {/* 登录按钮组 */}
      <div className="space-y-3">
        {/* OAuth 按钮行 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onGitHubLogin}
            disabled={disabled}
            className={buttonBaseClasses}
            aria-label="使用 GitHub 登录"
          >
            <GithubIcon />
            <span>GitHub</span>
          </button>
          
          <button
            type="button"
            onClick={onGoogleLogin}
            disabled={disabled}
            className={buttonBaseClasses}
            aria-label="使用 Google 登录"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>
        </div>

        {/* 生物验证按钮 - 全宽显示 */}
        {biometricCanUse && (
          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={disabled || isAuthenticating}
            className={buttonBaseClasses}
            aria-label={platformSupported ? '使用生物验证登录' : '使用安全密钥登录'}
          >
            {isAuthenticating ? (
              <svg 
                className="animate-spin h-5 w-5" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : currentBiometricError ? (
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <BiometricIcon />
            )}
            <span className="ml-2">
              {isAuthenticating 
                ? '验证中' 
                : currentBiometricError 
                ? '重试' 
                : platformSupported ? '生物验证' : '安全密钥'
              }
            </span>
          </button>
        )}
      </div>

      {/* 错误信息 - 只在有生物验证错误时显示 */}
      {biometricCanUse && currentBiometricError && (
        <p className="text-xs text-center text-red-600 dark:text-red-400 -mt-2">
          {currentBiometricError}
        </p>
      )}
    </>
  );
});

export default AlternativeLoginButtons;