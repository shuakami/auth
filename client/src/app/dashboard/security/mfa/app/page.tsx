/**
 * Authenticator App 页面 - /dashboard/security/mfa/app
 * 如果已启用显示管理界面，否则显示设置流程
 */

'use client';

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Smartphone } from 'lucide-react';
import { Breadcrumb } from '../../../components/shared';
import { useI18n } from '../../../i18n';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSecurity } from '../../../hooks';
import { useAuth } from '@/context/AuthContext';

export default function MfaAppPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    setup2FAData,
    is2FAEnabled,
    remainingBackupCount,
    isSettingUp2FA,
    isVerifying2FA,
    isDisabling2FA,
    initSetup2FA,
    confirmSetup2FA,
    disableTwoFA,
    clearSetup2FAData,
  } = useSecurity();
  
  // 设置流程步骤
  const [step, setStep] = useState<'password' | 'qr'>('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 管理模式状态
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableMode, setDisableMode] = useState<'totp' | 'backup'>('totp');

  // 第一步：验证密码获取 QR 码
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    try {
      await initSetup2FA(password);
      setStep('qr');
      setPassword('');
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || t.security.passwordVerifyFailed);
    }
  };

  // 处理验证码输入
  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setCode(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // 第二步：验证 TOTP 码
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    try {
      await confirmSetup2FA(fullCode);
      setShowRecoveryCodes(true);
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || t.security.codeVerifyFailed);
    }
  };

  // 复制恢复码
  const handleCopyAllCodes = () => {
    if (setup2FAData?.backupCodes) {
      navigator.clipboard.writeText(setup2FAData.backupCodes.join('\n'));
      toast(t.common.copied);
    }
  };

  // 完成设置
  const handleComplete = () => {
    setShowRecoveryCodes(false);
    clearSetup2FAData();
    router.push('/dashboard/security');
  };

  // 禁用 2FA
  const handleDisable = async () => {
    if (!disableCode.trim()) return;
    
    try {
      await disableTwoFA(
        disableMode === 'totp' 
          ? { token: disableCode } 
          : { backupCode: disableCode }
      );
      toast(t.security.authenticatorDisabled);
      setShowDisableModal(false);
      setDisableCode('');
      router.push('/dashboard/security');
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || t.security.disableFailed);
    }
  };

  if (!user) return null;

  // 如果已启用 TOTP，显示管理界面
  if (is2FAEnabled) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: t.nav.security, href: '/dashboard/security' },
            { label: t.security.authenticatorApp },
          ]}
        />
        <div className="p-4 md:py-6 lg:px-0">
          <div className="max-w-md mx-auto">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-regular">{t.security.authenticatorAppEnabled}</h3>
                <p className="text-sm text-muted">
                  {t.security.authenticatorAppEnabledDesc}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t.security.status}</span>
                <span>{t.security.enabled}</span>
              </div>
              {remainingBackupCount !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t.security.remainingBackupCodes}</span>
                  <span>{remainingBackupCount} {t.security.codesUnit}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push('/dashboard/security')}
                className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
              >
                {t.common.back}
              </button>
              <button
                onClick={() => setShowDisableModal(true)}
                className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
              >
                {t.common.disable}
              </button>
            </div>
          </div>
        </div>

        {/* 禁用确认模态框 */}
        <Modal
          isOpen={showDisableModal}
          onClose={() => {
            setShowDisableModal(false);
            setDisableCode('');
          }}
          title={t.security.disableAuthenticator}
          size="sm"
        >
          <div className="space-y-5">
            <p className="text-sm text-muted">
              {t.security.disableAuthenticatorDesc}
            </p>
            
            <div className="space-y-2">
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder={disableMode === 'totp' ? t.security.totpCodePlaceholder : t.security.backupCodePlaceholder}
                className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-muted bg-transparent focus:outline-none focus:border-foreground/50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setDisableMode(disableMode === 'totp' ? 'backup' : 'totp')}
                className="cursor-pointer text-sm text-muted hover:text-regular transition-colors"
              >
                {disableMode === 'totp' ? t.security.useBackupCode : t.security.useTotpCode}
              </button>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableCode('');
                }}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDisable}
                disabled={!disableCode.trim() || isDisabling2FA}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isDisabling2FA ? t.common.processing : t.security.confirmDisable}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // 未启用，显示设置流程
  return (
    <>
      <Breadcrumb
        items={[
          { label: t.nav.security, href: '/dashboard/security' },
          { label: t.security.addMfaDevice, href: '/dashboard/security/mfa' },
          { label: t.security.authenticatorApp },
        ]}
      />
      <div className="p-4 md:py-6 lg:px-0">
        {step === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col items-center mb-8">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-regular">{t.security.verifyPassword}</h3>
                <p className="text-sm text-subtle max-w-sm">
                  {t.security.verifyPasswordDesc}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-regular">{t.modals.currentPassword}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.modals.currentPasswordPlaceholder}
                  className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!password || isSettingUp2FA}
                className="cursor-pointer w-full inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSettingUp2FA ? t.common.processing : t.common.next}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="max-w-md mx-auto">
            <div className="flex flex-col items-center mb-10">
              {setup2FAData?.qr ? (
                <Image
                  src={setup2FAData.qr}
                  alt="QR Code"
                  width={192}
                  height={192}
                  className="rounded-lg mb-4"
                />
              ) : (
                <div className="w-48 h-48 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg mb-4" />
              )}
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-regular">{t.security.scanQrCode}</p>
                <p className="text-xs text-muted max-w-xs">{t.security.qrCodeHint}</p>
              </div>
              {setup2FAData?.secret && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted mb-1">{t.security.manualEntryHint}</p>
                  <code className="font-mono text-sm select-all bg-foreground/5 px-3 py-1 rounded">
                    {setup2FAData.secret}
                  </code>
                </div>
              )}
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
                disabled={code.join('').length !== 6 || isVerifying2FA}
                className="cursor-pointer w-full inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying2FA ? t.common.processing : t.security.verifyAndEnable}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 恢复码模态框 */}
      <Modal
        isOpen={showRecoveryCodes}
        onClose={handleComplete}
        title={t.security.mfaSetupComplete}
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg bg-foreground/5 p-3">
            <span className="text-sm">{t.security.authenticatorEnabled}</span>
          </div>
          
          <p className="text-sm text-muted">{t.security.recoveryCodesHint}</p>
          
          <div className="grid grid-cols-2 gap-2">
            {setup2FAData?.backupCodes?.map((code, index) => (
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
