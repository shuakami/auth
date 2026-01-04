/**
 * OAuth 应用管理页面 - /dashboard-test/oauth
 */

'use client';

import React, { useState } from 'react';
import { OAuthTab } from '../components/tabs/OAuthTab';
import { OAuthSettingsModal } from '../components/modals';
import { CustomToast } from '../components/CustomToast';
import { useToastMessage } from '../hooks';
import { useI18n } from '../i18n';
import { mockOAuthApps } from '../data/mock';
import type { OAuthApp } from '../types';

export default function OAuthPage() {
  const { t } = useI18n();

  // 弹窗状态
  const [showOAuthSettingsDialog, setShowOAuthSettingsDialog] = useState(false);
  const [selectedOAuthApp, setSelectedOAuthApp] = useState<OAuthApp | null>(null);
  const [editingOAuth, setEditingOAuth] = useState(false);
  const [editOAuthName, setEditOAuthName] = useState('');
  const [editOAuthStatus, setEditOAuthStatus] = useState('active');
  const [visibleSecrets, setVisibleSecrets] = useState<Set<number>>(new Set());

  // Toast
  const { toast, showToast } = useToastMessage();

  // 切换 secret 可见性
  const toggleSecretVisibility = (appId: number) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  return (
    <>
      <OAuthTab
        apps={mockOAuthApps}
        onAppSettings={(app) => {
          setSelectedOAuthApp(app);
          setShowOAuthSettingsDialog(true);
        }}
      />

      <OAuthSettingsModal
        isOpen={showOAuthSettingsDialog}
        app={selectedOAuthApp}
        editing={editingOAuth}
        editName={editOAuthName}
        editStatus={editOAuthStatus}
        visibleSecrets={visibleSecrets}
        onEditNameChange={setEditOAuthName}
        onEditStatusChange={setEditOAuthStatus}
        onToggleSecret={toggleSecretVisibility}
        onClose={() => {
          setShowOAuthSettingsDialog(false);
          setEditingOAuth(false);
        }}
        onEdit={() => {
          if (selectedOAuthApp) {
            setEditOAuthName(selectedOAuthApp.name);
            setEditOAuthStatus(selectedOAuthApp.enabled ? 'active' : 'disabled');
            setEditingOAuth(true);
          }
        }}
        onSave={() => {
          setEditingOAuth(false);
          setTimeout(() => showToast(t.toast.appUpdated, t.common.saving), 200);
        }}
        onCancelEdit={() => setEditingOAuth(false)}
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
