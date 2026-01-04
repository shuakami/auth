/**
 * 账户页面 - /dashboard-test
 */

'use client';

import React, { useState } from 'react';
import { AccountTab } from './components/tabs/AccountTab';
import {
  EditNameModal,
  UpdateEmailModal,
  SubscriptionModal,
  DisableMethodModal,
  ConnectMethodModal,
} from './components/modals';
import { CustomToast } from './components/CustomToast';
import { useToastMessage } from './hooks';
import { useI18n, interpolate } from './i18n';
import { mockUser } from './data/mock';
import type { SignInMethodType } from './types';

export default function AccountPage() {
  const { t } = useI18n();

  // 弹窗状态
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showUpdateEmailDialog, setShowUpdateEmailDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showDisableMethodDialog, setShowDisableMethodDialog] = useState(false);
  const [showConnectMethodDialog, setShowConnectMethodDialog] = useState(false);

  // 表单状态
  const [editNameValue, setEditNameValue] = useState(mockUser.name);
  const [editEmailValue, setEditEmailValue] = useState(mockUser.email);
  const [selectedMethod, setSelectedMethod] = useState<SignInMethodType>(null);

  // Toast
  const { toast, showToast } = useToastMessage();

  return (
    <>
      <AccountTab
        user={mockUser}
        onEditName={() => setShowEditNameDialog(true)}
        onUpdateEmail={() => setShowUpdateEmailDialog(true)}
        onManageSubscription={() => setShowSubscriptionDialog(true)}
        onDisableMethod={(method) => {
          setSelectedMethod(method);
          setShowDisableMethodDialog(true);
        }}
        onConnectMethod={(method) => {
          setSelectedMethod(method);
          setShowConnectMethodDialog(true);
        }}
      />

      {/* 弹窗 */}
      <EditNameModal
        isOpen={showEditNameDialog}
        value={editNameValue}
        onChange={setEditNameValue}
        onClose={() => setShowEditNameDialog(false)}
        onSubmit={() => setShowEditNameDialog(false)}
      />

      <UpdateEmailModal
        isOpen={showUpdateEmailDialog}
        value={editEmailValue}
        onChange={setEditEmailValue}
        onClose={() => setShowUpdateEmailDialog(false)}
        onSubmit={() => setShowUpdateEmailDialog(false)}
      />

      <SubscriptionModal
        isOpen={showSubscriptionDialog}
        onClose={() => setShowSubscriptionDialog(false)}
      />

      <DisableMethodModal
        isOpen={showDisableMethodDialog}
        method={selectedMethod}
        onClose={() => setShowDisableMethodDialog(false)}
        onConfirm={() => {
          const method = selectedMethod;
          setShowDisableMethodDialog(false);
          setTimeout(() => showToast(
            interpolate(t.toast.disabled, { method: method || '' }),
            t.toast.disabling
          ), 200);
        }}
      />

      <ConnectMethodModal
        isOpen={showConnectMethodDialog}
        method={selectedMethod}
        onClose={() => setShowConnectMethodDialog(false)}
        onConfirm={() => {
          const method = selectedMethod;
          setShowConnectMethodDialog(false);
          setTimeout(() => showToast(
            interpolate(t.toast.connected, { method: method || '' }),
            t.toast.connecting
          ), 200);
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
