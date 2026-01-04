/**
 * MFA 设备选择页面 - /dashboard/security/mfa
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Smartphone } from 'lucide-react';
import { PageHeader, Breadcrumb, SectionDivider } from '../../components/shared';
import { useI18n } from '../../i18n';
import { useSecurity } from '../../hooks';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function MfaSelectPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { 
    is2FAEnabled, 
    remainingBackupCount,
    isDisabling2FA,
    disableTwoFA,
  } = useSecurity();

  // 管理模态框状态
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableMode, setDisableMode] = useState<'totp' | 'backup'>('totp');

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
      setShowManageModal(false);
      setDisableCode('');
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || t.security.disableFailed);
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: t.nav.security, href: '/dashboard/security' },
          { label: t.security.addMfaDevice },
        ]}
      />
      <PageHeader title={t.security.addMfaDevice} description={t.security.addMfaDesc} />
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <SectionDivider />
        
        {/* 验证器应用 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.authenticatorApp}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">使用 Google Authenticator、Authy 等应用生成动态验证码</p>
            </div>
          </div>
          <div>
            {is2FAEnabled ? (
              <button
                onClick={() => setShowManageModal(true)}
                className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
              >
                {t.common.manage}
              </button>
            ) : (
              <Link
                href="/dashboard/security/mfa/app"
                className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
              >
                {t.common.setup}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <SectionDivider />

        {/* 生物识别 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.biometricAuth}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">使用指纹、面容或安全密钥进行身份验证</p>
            </div>
          </div>
          <div>
            <Link
              href="/dashboard/security/mfa/biometric"
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              {t.common.setup}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 管理模态框 */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title={t.security.authenticatorApp}
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
              <Smartphone className="w-7 h-7" />
            </div>
            <p className="text-sm text-muted text-center">
              {t.security.authenticatorAppEnabledDesc}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-muted p-4">
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

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setShowManageModal(false)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
            >
              {t.common.close}
            </button>
            <button
              onClick={() => {
                setShowManageModal(false);
                setShowDisableModal(true);
              }}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            >
              {t.common.disable}
            </button>
          </div>
        </div>
      </Modal>

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
