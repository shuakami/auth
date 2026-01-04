/**
 * 安全设置页面组件
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader, SectionDivider, InfoCard } from '../shared';
import { useI18n } from '../../i18n';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

// 模拟已有的 MFA 设备数据
const existingDevices = [
  {
    id: 1,
    type: 'app' as const,
    name: 'Google Authenticator',
    addedAt: '2024-10-15',
  },
  {
    id: 2,
    type: 'biometric' as const,
    name: 'MacBook Pro Touch ID',
    addedAt: '2024-11-20',
  },
];

interface MfaDevice {
  id: number;
  type: 'app' | 'biometric';
  name: string;
  addedAt: string;
}

interface SecurityTabProps {
  onSetPassword: () => void;
}

export function SecurityTab({ onSetPassword }: SecurityTabProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<MfaDevice | null>(null);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [hasExistingCodes, setHasExistingCodes] = useState(true); // 模拟已有恢复码

  // 是否已启用 MFA（有设备才能生成恢复码）
  const hasMfaEnabled = existingDevices.length > 0;

  // 处理移除设备
  const handleRemoveDevice = () => {
    // TODO: 调用 API 移除设备
    console.log('Remove device:', selectedDevice?.id);
    setSelectedDevice(null);
  };

  // 生成新的恢复码
  const handleGenerateCodes = () => {
    // TODO: 调用 API 生成恢复码
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
    setHasExistingCodes(true);
  };

  // 复制所有恢复码
  const handleCopyAllCodes = () => {
    if (recoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast(t.common.copied);
    }
  };

  // 关闭恢复码模态框
  const handleCloseRecoveryCodes = () => {
    setShowRecoveryCodes(false);
    setRecoveryCodes(null);
  };

  return (
    <>
      <PageHeader title={t.security.title} description={t.security.description} />
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <SectionDivider />

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.loginWithPassword}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">{t.security.loginWithPasswordDesc}</p>
            </div>
          </div>
          <div>
            <button
              onClick={onSetPassword}
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              <span className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden" aria-hidden="true" />
              {t.security.setPassword}
            </button>
          </div>
        </div>

        <SectionDivider />

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.mfa}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">{t.security.mfaDesc}</p>
            </div>
          </div>
          <div>
            <Link
              href="/dashboard-test/security/mfa"
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              <span className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden" aria-hidden="true" />
              {t.security.setupMfa}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 已有 MFA 设备列表 */}
        {existingDevices.length > 0 && (
          <InfoCard>
            {existingDevices.map((device) => (
              <div key={device.id} className="flex flex-row items-center justify-between gap-3 px-4 py-4 lg:px-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm">{device.name}</span>
                  <span className="text-subtle text-xs">
                  {device.type === 'app' ? t.security.deviceTypeApp : t.security.deviceTypeBiometric} · {t.security.addedOn} {device.addedAt}
                </span>
                </div>
                <button
                  onClick={() => setSelectedDevice(device)}
                  className="cursor-pointer px-3 py-1 text-sm rounded-full border border-primary/15 bg-transparent text-primary hover:bg-overlay-hover transition-colors"
                >
                  {t.common.manage}
                </button>
              </div>
            ))}
          </InfoCard>
        )}

        <SectionDivider />

        {/* 恢复码 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.recoveryCodes}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">
                {!hasMfaEnabled 
                  ? t.security.recoveryCodesDesc 
                  : hasExistingCodes 
                    ? t.security.recoveryCodesExist 
                    : t.security.recoveryCodesGenerate}
              </p>
            </div>
          </div>
          {hasMfaEnabled && (
            <div>
              <button
                onClick={() => setShowRecoveryCodes(true)}
                className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
              >
                {hasExistingCodes ? t.security.regenerateCodes : t.security.generateCodes}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 管理设备模态框 */}
      <Modal
        isOpen={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice?.name || ''}
        size="sm"
      >
        <div className="space-y-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t.security.deviceType}</span>
              <span>{selectedDevice?.type === 'app' ? t.security.deviceTypeApp : t.security.deviceTypeBiometric}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t.security.addedOn}</span>
              <span>{selectedDevice?.addedAt}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setSelectedDevice(null)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
            >
              {t.common.close}
            </button>
            <button
              onClick={handleRemoveDevice}
              className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            >
              {t.common.remove}
            </button>
          </div>
        </div>
      </Modal>

      {/* 恢复码模态框 */}
      <Modal
        isOpen={showRecoveryCodes}
        onClose={handleCloseRecoveryCodes}
        title={t.security.recoveryCodes}
        size="sm"
      >
        <div className="space-y-5">
          {!recoveryCodes ? (
            <>
              <p className="text-sm text-muted">{t.security.regenerateWarning}</p>
              
              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleCloseRecoveryCodes}
                  className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleGenerateCodes}
                  className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  {t.security.generateCodes}
                </button>
              </div>
            </>
          ) : (
            <>
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
                  onClick={handleCloseRecoveryCodes}
                  className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  {t.common.close}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
