/**
 * 两步验证模态框
 * 使用统一的 Modal 组件和设计系统
 */

'use client';

import { memo, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Shield } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    if (e.key === 'Enter' && code.length === 6) {
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
    if (mode === 'totp' && code.length !== 6) return;
    if (mode === 'backup' && !code.trim()) return;
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>
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
                  className="w-11 h-12 text-center text-lg font-medium border border-muted bg-transparent rounded-lg focus:outline-none focus:border-foreground/50 transition-colors disabled:opacity-50"
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
                  className="w-11 h-12 text-center text-lg font-medium border border-muted bg-transparent rounded-lg focus:outline-none focus:border-foreground/50 transition-colors disabled:opacity-50"
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
              className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-muted bg-transparent text-regular placeholder:text-muted focus:outline-none focus:border-foreground/50 transition-colors disabled:opacity-50"
            />
          </div>
        )}

        {/* 错误消息 */}
        {message && messageType === 'error' && (
          <p className="text-sm text-red-500 text-center mb-4">{message}</p>
        )}

        {/* 模式切换 */}
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={onModeToggle}
            disabled={loading}
            className="cursor-pointer text-sm text-muted hover:text-regular transition-colors disabled:opacity-50"
          >
            {mode === 'totp' ? '使用备份码' : '使用验证器'}
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || (mode === 'totp' ? code.length !== 6 : !code.trim())}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '验证中...' : '验证'}
          </button>
        </div>
      </form>
    </Modal>
  );
});

export default TwoFactorModal;
