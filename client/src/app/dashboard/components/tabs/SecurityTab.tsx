/**
 * 安全设置页面组件
 * 使用真实 API 管理 2FA、备份码等
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader, SectionDivider, InfoCard } from '../shared';
import { useI18n } from '../../i18n';
import { Modal, FormModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSecurity } from '../../hooks';
import { useAuth } from '@/context/AuthContext';
import useWebAuthn from '@/hooks/useWebAuthn';

interface MfaDevice {
  id: string;
  type: 'app' | 'biometric';
  name: string;
  addedAt: string;
}

export function SecurityTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    remainingBackupCount,
    is2FAEnabled,
    hasPassword,
    isGeneratingBackupCodes,
    isUpdatingPassword,
    isDisabling2FA,
    generateNewBackupCodes,
    setPassword,
    disableTwoFA,
  } = useSecurity();

  const {
    credentials: webAuthnCredentials,
    isLoading: isLoadingWebAuthn,
    deleteCredential,
    updateCredentialName,
  } = useWebAuthn();

  // 设备列表（合并 TOTP 和 WebAuthn）
  const [devices, setDevices] = useState<MfaDevice[]>([]);
  
  // 弹窗状态
  const [selectedDevice, setSelectedDevice] = useState<MfaDevice | null>(null);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  
  // 表单状态
  const [passwordForBackup, setPasswordForBackup] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');

  // 构建设备列表
  useEffect(() => {
    const deviceList: MfaDevice[] = [];
    
    // 添加 TOTP 设备
    if (is2FAEnabled) {
      deviceList.push({
        id: 'totp',
        type: 'app',
        name: 'Authenticator App',
        addedAt: '-',
      });
    }
    
    // 添加 WebAuthn 设备
    webAuthnCredentials.forEach((cred) => {
      deviceList.push({
        id: cred.id,
        type: 'biometric',
        name: cred.name,
        addedAt: new Date(cred.createdAt).toLocaleDateString(),
      });
    });
    
    setDevices(deviceList);
  }, [is2FAEnabled, webAuthnCredentials]);

  // 是否已启用 MFA
  const hasMfaEnabled = devices.length > 0;

  // 处理移除设备
  const handleRemoveDevice = async () => {
    if (!selectedDevice) return;
    
    try {
      if (selectedDevice.type === 'app') {
        // 关闭 TOTP 需要验证码
        setShowDisable2FAModal(true);
        setSelectedDevice(null);
      } else {
        // 删除 WebAuthn 凭据
        await deleteCredential(selectedDevice.id);
        toast(t.common.remove + '成功');
        setSelectedDevice(null);
      }
    } catch (err: any) {
      toast(err.message || '操作失败');
    }
  };

  // 关闭 2FA
  const handleDisable2FA = async () => {
    if (!disable2FACode) return;
    
    try {
      const isTotp = /^\d{6}$/.test(disable2FACode);
      await disableTwoFA(isTotp ? { token: disable2FACode } : { backupCode: disable2FACode });
      toast('2FA 已关闭');
      setShowDisable2FAModal(false);
      setDisable2FACode('');
    } catch (err: any) {
      toast(err.message || '关闭失败');
    }
  };

  // 生成新的恢复码
  const handleGenerateCodes = async () => {
    if (!passwordForBackup) return;
    
    try {
      const codes = await generateNewBackupCodes(passwordForBackup);
      setRecoveryCodes(codes);
      setPasswordForBackup('');
    } catch (err: any) {
      toast(err.message || '生成失败');
    }
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
    setPasswordForBackup('');
  };

  // 设置/修改密码
  const handleSetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast('两次输入的密码不一致');
      return;
    }
    
    try {
      await setPassword({
        oldPassword: hasPassword ? oldPassword : undefined,
        newPassword,
      });
      toast(t.toast.passwordUpdated);
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast(err.message || '设置失败');
    }
  };

  return (
    <>
      <PageHeader title={t.security.title} description={t.security.description} />
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <SectionDivider />

        {/* 密码设置 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.loginWithPassword}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">{t.security.loginWithPasswordDesc}</p>
              {hasPassword && (
                <p className="text-sm text-muted mt-2">{t.account.passwordSet}</p>
              )}
            </div>
          </div>
          <div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              {hasPassword ? t.common.change : t.common.set}
            </button>
          </div>
        </div>

        <SectionDivider />

        {/* MFA 设置 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.mfa}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">{t.security.mfaDesc}</p>
            </div>
          </div>
          <div>
            <Link
              href="/dashboard/security/mfa"
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              {t.security.setupMfa}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 已有 MFA 设备列表 */}
        {devices.length > 0 && (
          <InfoCard>
            {devices.map((device) => (
              <div key={device.id} className="flex flex-row items-center justify-between gap-3 px-4 py-4 lg:px-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm">{device.name}</span>
                  <span className="text-subtle text-xs">
                    {device.type === 'app' ? t.security.deviceTypeApp : t.security.deviceTypeBiometric}
                    {device.addedAt !== '-' && ` · ${t.security.addedOn} ${device.addedAt}`}
                    {is2FAEnabled && device.type === 'app' && remainingBackupCount !== null && (
                      <span className="ml-2">· 剩余备份码: {remainingBackupCount}</span>
                    )}
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
                  : remainingBackupCount !== null && remainingBackupCount > 0
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
                {remainingBackupCount !== null && remainingBackupCount > 0 ? t.security.regenerateCodes : t.security.generateCodes}
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
            {selectedDevice?.addedAt !== '-' && (
              <div className="flex justify-between">
                <span className="text-muted">{t.security.addedOn}</span>
                <span>{selectedDevice?.addedAt}</span>
              </div>
            )}
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

      {/* 关闭 2FA 模态框 */}
      <FormModal
        isOpen={showDisable2FAModal}
        onClose={() => {
          setShowDisable2FAModal(false);
          setDisable2FACode('');
        }}
        onSubmit={handleDisable2FA}
        title="关闭两步验证"
        submitText={t.common.confirm}
        isLoading={isDisabling2FA}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">请输入 6 位验证码或备份码以关闭 2FA。</p>
          <div>
            <label className="block text-sm font-medium mb-1.5">验证码 / 备份码</label>
            <input
              type="text"
              value={disable2FACode}
              onChange={(e) => setDisable2FACode(e.target.value)}
              placeholder="6 位验证码或备份码"
              className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg"
            />
          </div>
        </div>
      </FormModal>

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
              
              <div>
                <label className="block text-sm font-medium mb-1.5">{t.modals.currentPassword}</label>
                <input
                  type="password"
                  value={passwordForBackup}
                  onChange={(e) => setPasswordForBackup(e.target.value)}
                  placeholder={t.modals.currentPasswordPlaceholder}
                  className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg"
                />
              </div>
              
              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleCloseRecoveryCodes}
                  className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleGenerateCodes}
                  disabled={!passwordForBackup || isGeneratingBackupCodes}
                  className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {isGeneratingBackupCodes ? t.common.processing : t.security.generateCodes}
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

      {/* 设置/修改密码模态框 */}
      <FormModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
        onSubmit={handleSetPassword}
        title={hasPassword ? t.modals.changePassword : t.modals.setPassword}
        submitText={t.modals.updatePassword}
        isLoading={isUpdatingPassword}
      >
        <div className="space-y-4">
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium mb-1.5">{t.modals.currentPassword}</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={t.modals.currentPasswordPlaceholder}
                className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.modals.newPassword}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.modals.newPasswordPlaceholder}
              className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.modals.confirmPassword}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.modals.confirmPasswordPlaceholder}
              className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:border-neutral-400 rounded-lg"
            />
          </div>
        </div>
      </FormModal>
    </>
  );
}
