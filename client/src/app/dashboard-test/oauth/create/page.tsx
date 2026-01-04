/**
 * 创建 OAuth 应用页面 - /dashboard-test/oauth/create
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check } from 'lucide-react';
import { PageHeader, Breadcrumb, SectionDivider } from '../../components/shared';
import { useI18n } from '../../i18n';

// 可用的 OAuth scopes
const AVAILABLE_SCOPES = [
  { id: 'openid', name: 'OpenID', description: '基础身份验证', required: true },
  { id: 'profile', name: 'Profile', description: '用户基本资料' },
  { id: 'email', name: 'Email', description: '邮箱地址' },
];

export default function OAuthCreatePage() {
  const { t } = useI18n();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['openid']));
  const [credentials, setCredentials] = useState({ clientId: '', clientSecret: '' });

  // 切换 scope
  const toggleScope = (scope: string) => {
    if (scope === 'openid') return;
    setSelectedScopes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scope)) {
        newSet.delete(scope);
      } else {
        newSet.add(scope);
      }
      return newSet;
    });
  };

  // 创建应用
  const handleCreate = () => {
    const clientId = 'xai_' + Math.random().toString(36).substring(2, 15);
    const clientSecret = 'xais_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setCredentials({ clientId, clientSecret });
    setStep(3);
  };

  // 步骤 1: 基本信息
  if (step === 1) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: t.nav.oauth, href: '/dashboard-test/oauth' },
            { label: t.oauth.createApp },
          ]}
        />
        <PageHeader title={t.oauth.createApp} description={t.oauth.createAppDesc} />
        <div className="p-4 md:py-6 lg:px-0 space-y-10">
          <SectionDivider />
          <form className="max-w-lg space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-regular">{t.oauth.appName}</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent rounded-lg placeholder:text-subtle"
                placeholder={t.oauth.appNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-regular">{t.oauth.redirectUri}</label>
              <input
                type="url"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent rounded-lg placeholder:text-subtle font-mono"
                placeholder="https://example.com/callback"
              />
              <p className="text-xs text-muted">{t.oauth.redirectUriHint}</p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!appName || !redirectUri}
                className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                {t.common.next}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  // 步骤 2: 选择权限
  if (step === 2) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: t.nav.oauth, href: '/dashboard-test/oauth' },
            { label: t.oauth.createApp },
          ]}
        />
        <PageHeader title={t.oauth.selectScopes} description={t.oauth.selectScopesDesc} />
        <div className="p-4 md:py-6 lg:px-0 space-y-10">
          <SectionDivider />
          <div className="max-w-lg space-y-4">
            {AVAILABLE_SCOPES.map((scope) => (
              <button
                key={scope.id}
                type="button"
                onClick={() => toggleScope(scope.id)}
                disabled={scope.required}
                className={`cursor-pointer w-full p-4 rounded-xl border text-left transition-colors ${
                  selectedScopes.has(scope.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:bg-overlay-hover'
                } ${scope.required ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-regular">{scope.name}</p>
                    <p className="text-xs text-subtle mt-1">{scope.description}</p>
                  </div>
                  {selectedScopes.has(scope.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full border border-muted bg-transparent text-primary hover:bg-overlay-hover transition-colors"
            >
              {t.common.back}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              {t.oauth.createApp}
            </button>
          </div>
        </div>
      </>
    );
  }

  // 步骤 3: 显示凭证
  return (
    <>
      <Breadcrumb
        items={[
          { label: t.nav.oauth, href: '/dashboard-test/oauth' },
          { label: t.oauth.createApp },
        ]}
      />
      <PageHeader title={t.oauth.appCreated} description={t.oauth.appCreatedDesc} />
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <SectionDivider />
        <div className="max-w-lg space-y-6">
          <div className="p-4 rounded-xl bg-surface-l1 border border-muted space-y-4">
            <div>
              <p className="text-xs text-muted mb-1">Client ID</p>
              <p className="font-mono text-sm text-regular break-all">{credentials.clientId}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Client Secret</p>
              <p className="font-mono text-sm text-regular break-all">{credentials.clientSecret}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {t.oauth.secretWarning}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard-test/oauth')}
            className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            {t.common.done}
          </button>
        </div>
      </div>
    </>
  );
}
