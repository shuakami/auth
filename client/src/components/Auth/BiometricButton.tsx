/**
 * 生物验证按钮组件
 * 用于触发生物验证流程的按钮
 */
import { memo } from 'react';
import { Fingerprint, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

// 生物验证图标组件
const BiometricIcon = memo(function BiometricIcon() {
  return (
    <Fingerprint className="h-5 w-5" aria-hidden="true" />
  );
});

// 安全盾牌图标
const SecurityIcon = memo(function SecurityIcon() {
  return (
    <Shield className="h-5 w-5" aria-hidden="true" />
  );
});

// 错误图标
const ErrorIcon = memo(function ErrorIcon() {
  return (
    <AlertCircle className="h-5 w-5" aria-hidden="true" />
  );
});

interface BiometricButtonProps {
  variant?: 'login' | 'register' | 'verify';
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

const BiometricButton = memo(function BiometricButton({
  variant = 'login',
  disabled = false,
  loading = false,
  error = false,
  onClick,
  className,
  children,
}: BiometricButtonProps) {
  // 根据变体和状态选择样式和图标
  const getButtonConfig = () => {
    if (error) {
      return {
        icon: <ErrorIcon />,
        text: children || '生物验证失败',
        className: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 focus:ring-red-500 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30',
      };
    }

    switch (variant) {
      case 'register':
        return {
          icon: <SecurityIcon />,
          text: children || '设置生物验证',
          className: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 focus:ring-green-500 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30',
        };
      case 'verify':
        return {
          icon: <BiometricIcon />,
          text: children || '验证生物信息',
          className: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 focus:ring-blue-500 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30',
        };
      default: // login
        return {
          icon: <BiometricIcon />,
          text: children || '生物验证登录',
          className: 'bg-[#0582FF] border-transparent text-white hover:bg-[#006ADF] focus:ring-[#0582FF]',
        };
    }
  };

  const config = getButtonConfig();

  const baseClasses = cn(
    // 基础样式
    'inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm',
    // Focus 状态
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    // Disabled 状态
    'disabled:cursor-not-allowed disabled:opacity-60',
    // 深色模式适配
    'dark:focus:ring-offset-[#09090b]',
    // 过渡动画
    'transition-colors duration-200',
    // 具体变体样式
    config.className,
    className
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClasses}
      aria-label={typeof config.text === 'string' ? config.text : '生物验证'}
    >
      {loading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-3 h-5 w-5" 
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
          验证中...
        </>
      ) : (
        <>
          <span className="mr-2">{config.icon}</span>
          {config.text}
        </>
      )}
    </button>
  );
});

export default BiometricButton;