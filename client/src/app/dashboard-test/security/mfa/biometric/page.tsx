/**
 * 生物识别设置页面 - /dashboard-test/security/mfa/biometric
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, CheckCircle } from 'lucide-react';
import { Breadcrumb } from '../../../components/shared';
import { useI18n } from '../../../i18n';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function MfaBiometricPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deviceName, setDeviceName] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // 提交设置
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    setIsSettingUp(true);
    
    // TODO: 调用 WebAuthn API 进行生物识别注册
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
    setIsSettingUp(false);
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
                使用指纹或面容快速验证身份，验证信息仅存储在您的设备上，不会上传到服务器。
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-regular">{t.security.deviceName}</label>
              <input
                className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg placeholder:text-subtle"
                placeholder={t.security.deviceNamePlaceholder}
                autoComplete="off"
                name="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
              <p className="text-xs text-muted">{t.security.deviceNameHint}</p>
            </div>
            <button
              type="submit"
              disabled={!deviceName.trim() || isSettingUp}
              className="cursor-pointer w-full inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSettingUp ? t.common.processing : t.security.startBiometricSetup}
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
          <div className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5">
            <CheckCircle className="w-5 h-5 text-foreground" />
            <span className="text-sm">{t.security.biometricEnabled}</span>
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
