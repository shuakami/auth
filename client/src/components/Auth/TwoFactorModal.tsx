import { memo } from 'react';
import ConfirmModal from '@/components/ui/confirm-modal';
import { AUTH_CONSTANTS, type TwoFAMode, type MessageType } from '@/constants/auth';

interface TwoFactorModalProps {
  isOpen: boolean;
  mode: TwoFAMode;
  code: string;
  message: string;
  messageType: MessageType;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCodeChange: (code: string) => void;
  onModeToggle: () => void;
}

const TwoFactorModal = memo(function TwoFactorModal({
  isOpen,
  mode,
  code,
  message,
  messageType,
  loading,
  onClose,
  onConfirm,
  onCodeChange,
  onModeToggle,
}: TwoFactorModalProps) {
  const content = (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-neutral-600 dark:text-neutral-500">
        您的账户已启用两步验证。请输入{mode === 'totp' ? '您的动态验证码' : '一个未使用的备份码'}。
      </p>
      
      <div>
        <label 
          htmlFor="2fa-code" 
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {mode === 'totp' ? '动态验证码 (6位数字)' : '备份码'}
        </label>
        <input
          id="2fa-code"
          name="2fa-code"
          type={mode === 'totp' ? 'text' : 'password'}
          inputMode={mode === 'totp' ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
          maxLength={mode === 'totp' ? AUTH_CONSTANTS.TWO_FA.TOTP_LENGTH : undefined}
          pattern={mode === 'totp' ? AUTH_CONSTANTS.TWO_FA.PATTERN : undefined}
          autoFocus
          placeholder={mode === 'totp' ? '请输入6位数字验证码' : '请输入备份码'}
        />
      </div>

      {/* 2FA 消息信息 */}
      {message && (
        <div 
          className={`text-sm ${
            messageType === 'info' 
              ? 'text-neutral-600 dark:text-neutral-400' 
              : 'text-red-600 dark:text-red-400'
          }`}
          role="alert"
        >
          {message}
        </div>
      )}

      {/* 模式切换按钮 */}
      <div className="text-left">
        <button
          type="button"
          onClick={onModeToggle}
          className="text-sm font-medium text-[#0582FF] hover:underline dark:text-[#3898FF] dark:hover:underline focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-white"
          disabled={loading}
        >
          {mode === 'totp' ? '使用备份码' : '使用动态验证码'}
        </button>
      </div>
    </div>
  );

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="两步验证"
      confirmText="验证"
      cancelText="取消"
      isLoading={loading}
      message={content}
    />
  );
});

export default TwoFactorModal;