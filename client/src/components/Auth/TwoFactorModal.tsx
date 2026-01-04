/**
 * 两步验证模态框
 * 使用统一的 Modal 组件和设计系统
 * 支持 Vercel 风格的 loading 动画
 */

'use client';

import { memo, useRef, useEffect, useState, KeyboardEvent, ClipboardEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { type TwoFAMode, type MessageType } from '@/constants/auth';

// Loading Spinner 组件 - Vercel 风格扇形
function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin-fast ${className}`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M8 0a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V0z"
        fill="currentColor"
      />
    </svg>
  );
}

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);

  // 错误消息用 toast 显示
  useEffect(() => {
    if (message && messageType === 'error') {
      toast(message);
    }
  }, [message, messageType, toast]);

  // TOTP 模式下的 6 位数字输入
  const codeArray = mode === 'totp' ? code.padEnd(6, '').split('').slice(0, 6) : [];

  const handleTotpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = codeArray.slice();
    newCode[index] = value.slice(-1);
    onCodeChange(newCode.join(''));

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      onConfirm();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      onCodeChange(pastedData);
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'totp' && code.length !== 6) return;
    if (mode === 'backup' && !code.trim()) return;
    onConfirm();
  };

  // 关闭时的处理（带动画）
  const handleClose = () => {
    if (loading) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  const isDisabled = loading || (mode === 'totp' ? code.length !== 6 : !code.trim());

  return (
    <Modal isOpen={isOpen && !isClosing} onClose={handleClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="text-center mb-6">
          <h2 className="text-lg font-medium text-regular">两步验证</h2>
          <p className="text-sm text-muted mt-2">
            {mode === 'totp' 
              ? '请输入验证器应用中的 6 位验证码' 
              : '请输入一个未使用的备份码'}
          </p>
        </div>

        {mode === 'totp' ? (
          // TOTP 6位数字输入
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={codeArray[i] || ''}
                  onChange={(e) => handleTotpInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  autoFocus={i === 0}
                  className="w-11 h-12 text-center text-lg font-medium border border-muted bg-transparent rounded-lg focus:outline-none focus:border-foreground/50 transition-all duration-150 disabled:opacity-50"
                />
              ))}
            </div>
            <div className="w-3 h-[2px] bg-muted" />
            <div className="flex items-center gap-2">
              {[3, 4, 5].map((i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={codeArray[i] || ''}
                  onChange={(e) => handleTotpInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className="w-11 h-12 text-center text-lg font-medium border border-muted bg-transparent rounded-lg focus:outline-none focus:border-foreground/50 transition-all duration-150 disabled:opacity-50"
                />
              ))}
            </div>
          </div>
        ) : (
          // 备份码输入
          <div className="mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="输入备份码"
              className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-muted bg-transparent text-regular placeholder:text-muted focus:outline-none focus:border-foreground/50 transition-all duration-150 disabled:opacity-50"
            />
          </div>
        )}

        {/* 模式切换 */}
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={onModeToggle}
            disabled={loading}
            className="cursor-pointer text-sm text-muted hover:text-regular transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'totp' ? '使用备份码' : '使用验证器'}
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isDisabled}
            className={`cursor-pointer flex-1 h-9 font-medium text-sm rounded-full transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              loading
                ? 'bg-foreground text-background'
                : isDisabled
                ? 'bg-foreground/50 text-background/70'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
          >
            {loading ? (
              <>
                <LoadingSpinner className="h-4 w-4" />
                <span>验证中</span>
              </>
            ) : (
              '验证'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
});

export default TwoFactorModal;
