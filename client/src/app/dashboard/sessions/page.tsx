/**
 * 会话管理页面 - /dashboard/sessions
 */

'use client';

import React from 'react';
import { SessionsTab } from '../components/tabs/SessionsTab';
import { useSessions } from '../hooks';
import { useAuth } from '@/context/AuthContext';

export default function SessionsPage() {
  const { user } = useAuth();
  const {
    sessions,
    isLoading,
    isRevoking,
    revokeSessionById,
    revokeAllOtherSessions,
  } = useSessions();

  if (!user) return null;

  return (
    <SessionsTab
      sessions={sessions}
      isLoading={isLoading}
      isRevoking={isRevoking}
      onRevokeSession={revokeSessionById}
      onRevokeAllOther={revokeAllOtherSessions}
    />
  );
}
