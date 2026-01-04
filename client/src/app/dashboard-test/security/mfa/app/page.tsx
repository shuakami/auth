/**
 * Authenticator App 设置页面 - /dashboard-test/security/mfa/app
 */

'use client';

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '../../../components/shared';
import { useI18n } from '../../../i18n';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function MfaAppPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 处理输入
  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // 自动跳转到下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 处理键盘事件
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 处理粘贴
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setCode(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // 提交验证
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setIsVerifying(true);
    
    // TODO: 调用 API 验证
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟生成恢复码
    const newCodes = [
      'ABCD-1234-EFGH',
      'IJKL-5678-MNOP',
      'QRST-9012-UVWX',
      'YZAB-3456-CDEF',
      'GHIJ-7890-KLMN',
      'OPQR-1234-STUV',
      'WXYZ-5678-ABCD',
      'EFGH-9012-IJKL',
    ];
    
    setRecoveryCodes(newCodes);
    setShowRecoveryCodes(true);
    setIsVerifying(false);
  };

  // 复制恢复码
  const handleCopyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast(t.common.copied);
  };

  // 完成设置
  const handleComplete = () => {
    setShowRecoveryCodes(false);
    router.push('/dashboard-test/security');
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: t.nav.security, href: '/dashboard-test/security' },
          { label: t.security.addMfaDevice, href: '/dashboard-test/security/mfa' },
          { label: t.security.authenticatorApp },
        ]}
      />
      <div className="p-4 md:py-6 lg:px-0">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col items-center mb-10">
            <div className="p-6 bg-background rounded-2xl border border-muted mb-4">
              <div className="w-48 h-48 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-regular">{t.security.scanQrCode}</p>
              <p className="text-xs text-muted max-w-xs">{t.security.qrCodeHint}</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-base font-medium text-regular mb-2">{t.security.enterCode}</h3>
              </div>
              <div className="flex items-center justify-center gap-3 py-6">
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[i]}
                      onChange={(e) => handleInput(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      className="w-12 h-14 text-center text-lg font-medium border border-muted bg-surface-l1 rounded-lg focus:outline-none focus:border-neutral-400 transition-all"
                    />
                  ))}
                </div>
                <div className="w-8 h-[2px] bg-muted" />
                <div className="flex items-center gap-2">
                  {[3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[i]}
                      onChange={(e) => handleInput(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      className="w-12 h-14 text-center text-lg font-medium border border-muted bg-surface-l1 rounded-lg focus:outline-none focus:border-neutral-400 transition-all"
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={code.join('').length !== 6 || isVerifying}
              className="cursor-pointer w-full inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? t.common.processing : t.security.verifyAndEnable}
            </button>
          </div>
        </form>
      </div>

      {/* 恢复码模态框 */}
      <Modal
        isOpen={showRecoveryCodes}
        onClose={handleComplete}
        title={t.security.mfaSetupComplete}
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg bg-foreground/5">
            <span className="text-sm">{t.security.authenticatorEnabled}</span>
          </div>
          
          <p className="text-sm text-muted">{t.security.recoveryCodesHint}</p>
          
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((code, index) => (
              <div key={index} className="font-mono text-sm py-2 px-3 rounded-lg bg-foreground/5">
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={handleCopyAllCodes}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
            >
              {t.common.copy}
            </button>
            <button
              onClick={handleComplete}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
