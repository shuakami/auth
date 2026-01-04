/**
 * 安全设置页面 - /dashboard-test/security
 */

'use client';

import React, { useState } from 'react';
import { SecurityTab } from '../components/tabs/SecurityTab';
import { SetPasswordModal } from '../components/modals';
import { CustomToast } from '../components/CustomToast';
import { useToastMessage } from '../hooks';
import { useI18n } from '../i18n';

export default function SecurityPage() {
  const { t } = useI18n();

  // 弹窗状态
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Toast
  const { toast, showToast } = useToastMessage();

  return (
    <>
      <SecurityTab
        onSetPassword={() => setShowSetPasswordDialog(true)}
      />

      <SetPasswordModal
        isOpen={showSetPasswordDialog}
        password={newPassword}
        confirmPassword={confirmPassword}
        onPasswordChange={setNewPassword}
        onConfirmChange={setConfirmPassword}
        onClose={() => {
          setShowSetPasswordDialog(false);
          setNewPassword('');
          setConfirmPassword('');
        }}
        onSubmit={() => {
          setShowSetPasswordDialog(false);
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => showToast(t.toast.passwordUpdated, t.toast.updatingPassword), 200);
        }}
      />

      <CustomToast
        visible={toast.visible}
        message={toast.message}
        loading={toast.loading}
        closing={toast.closing}
      />
    </>
  );
}
