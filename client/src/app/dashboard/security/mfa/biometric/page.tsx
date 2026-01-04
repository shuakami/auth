/**
 * 生物识别设置页面 - /dashboard/security/mfa/biometric
 * 使用真实 WebAuthn API
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '../../../components/shared';
import { useI18n } from '../../../i18n';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import useWebAuthn from '@/hooks/useWebAuthn';

export default function MfaBiometricPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    canUse,
    browserSupported,
    platformSupported,
    isRegistering,
    error,
    registerBiometric,
    clearError,
  } = useWebAuthn();
  
  const [deviceName, setDeviceName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    try {
      await registerBiometric(deviceName.trim());
      toast('生物识别设备已添加');
      router.push('/dashboard/security');
    } catch (err: any) {
      toast(err.message || '设置失败');
    }
  };

  if (!user) return null;

  if (!canUse) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: t.nav.security, href: '/dashboard/security' },
            { label: t.security.addMfaDevice, href: '/dashboard/security/mfa' },
            { label: t.security.biometricAuth },
          ]}
        />
        <div className="p-4 md:py-6 lg:px-0">
          <div className="max-w-md mx-auto">
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-regular mb-2">生物验证不可用</h3>
              <p className="text-sm text-subtle max-w-sm">
                {!browserSupported 
                  ? '您的浏览器不支持 WebAuthn 生物验证功能。'
                  : '生物验证功能当前不可用。'
                }
              </p>
              <button
                onClick={() => router.back()}
                className="cursor-pointer mt-6 h-9 px-4 text-sm rounded-full border border-muted hover:bg-overlay-hover"
              >
                {t.common.back}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: t.nav.security, href: '/dashboard/security' },
          { label: t.security.addMfaDevice, href: '/dashboard/security/mfa' },
          { label: t.security.biometricAuth },
        ]}
      />
      <div className="p-4 md:py-6 lg:px-0">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Fingerprint className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-regular">{t.security.setupBiometric}</h3>
              <p className="text-sm text-subtle max-w-sm">
                使用指纹或面容快速验证身份，验证信息仅存储在您的设备上。
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-regular">{t.security.deviceName}</label>
              <input
                className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg placeholder:text-subtle"
                placeholder={t.security.deviceNamePlaceholder}
                autoComplete="off"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted">{t.security.deviceNameHint}</p>
            </div>
            <button
              type="submit"
              disabled={!deviceName.trim() || isRegistering}
              className="cursor-pointer w-full h-10 text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {isRegistering ? t.common.processing : t.security.startBiometricSetup}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
