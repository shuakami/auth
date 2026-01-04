/**
 * 会话管理页面 - /dashboard-test/sessions
 */

'use client';

import React, { useState } from 'react';
import { SessionsTab } from '../components/tabs/SessionsTab';
import { SignOutAllModal } from '../components/modals';
import { CustomToast } from '../components/CustomToast';
import { useSessionTransition, useToastMessage } from '../hooks';
import { useI18n } from '../i18n';
import { mockSessions } from '../data/mock';

export default function SessionsPage() {
  const { t } = useI18n();

  // 会话状态
  const { selectedSession, isTransitioning, handleSessionSelect } = useSessionTransition(mockSessions[0]);

  // 弹窗状态
  const [showSignOutAllDialog, setShowSignOutAllDialog] = useState(false);

  // Toast
  const { toast, showToast } = useToastMessage();

  return (
    <>
      <SessionsTab
        sessions={mockSessions}
        selectedSession={selectedSession}
        isTransitioning={isTransitioning}
        onSessionSelect={handleSessionSelect}
        onSignOutAll={() => setShowSignOutAllDialog(true)}
      />

      <SignOutAllModal
        isOpen={showSignOutAllDialog}
        onClose={() => setShowSignOutAllDialog(false)}
        onConfirm={() => {
          setShowSignOutAllDialog(false);
          setTimeout(() => showToast(t.toast.signedOutAll, t.toast.signingOut), 200);
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
