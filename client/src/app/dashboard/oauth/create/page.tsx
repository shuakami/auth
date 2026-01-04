/**
 * 创建 OAuth 应用页面 - /dashboard/oauth/create
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check, Globe, Smartphone, Monitor, Server, Eye, EyeOff } from 'lucide-react';
import { PageHeader, Breadcrumb, SectionDivider, DashboardCopyButton } from '../../components/shared';
import { Select } from '@/components/ui/Select';
import { useI18n } from '../../i18n';
import { useToast } from '@/components/ui/Toast';
import { createOAuthApp, type OAuthApp } from '@/services/oauth';

// 应用类型选项
const APP_TYPES = [
  { value: 'web', label: 'Web 应用', icon: Globe, description: '浏览器中运行的应用' },
  { value: 'mobile', label: '移动应用', icon: Smartphone, description: 'iOS 或 Android 应用' },
  { value: 'desktop', label: '桌面应用', icon: Monitor, description: 'Windows/Mac/Linux 应用' },
  { value: 'server', label: '服务端应用', icon: Server, description: '后端服务或 API' },
];

// 可用的 OAuth scopes
const AVAILABLE_SCOPES = [
  { id: 'openid', name: 'OpenID Connect', description: '基础身份验证', required: true },
  { id: 'profile', name: '基本资料', description: '用户名、头像等' },
  { id: 'email', name: '邮箱地址', description: '用户邮箱' },
  { id: 'phone', name: '手机号码', description: '用户手机号' },
  { id: 'offline_access', name: '离线访问', description: '发放 Refresh Token' },
];

export default function OAuthCreatePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // 表单数据
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState<'web' | 'mobile' | 'desktop' | 'server'>('web');
  const [description, setDescription] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['openid', 'profile', 'email']));
  const [issueRefreshToken, setIssueRefreshToken] = useState(false);
  
  // 创建结果
  const [createdApp, setCreatedApp] = useState<OAuthApp | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // 切换 scope
  const toggleScope = (scope: string) => {
    if (scope === 'openid') return;
    setSelectedScopes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scope)) {
        newSet.delete(scope);
        // 如果取消 offline_access，也取消 issueRefreshToken
        if (scope === 'offline_access') {
          setIssueRefreshToken(false);
        }
      } else {
        newSet.add(scope);
      }
      return newSet;
    });
  };

  // 创建应用
  const handleCreate = async () => {
    if (!appName.trim() || !redirectUri.trim()) {
      toast('请填写必填字段');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createOAuthApp({
        name: appName.trim(),
        description: description.trim() || undefined,
        type: appType,
        redirectUris: redirectUri.split('\n').map(u => u.trim()).filter(Boolean),
        scopes: Array.from(selectedScopes),
        issueRefreshToken,
      });
      setCreatedApp(result.app);
      setStep(3);
      toast('应用创建成功');
    } catch (err: any) {
      toast(err.response?.data?.error || err.message || '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 步骤 1: 基本信息
  if (step === 1) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: t.nav.oauth, href: '/dashboard/oauth' },
            { label: t.oauth.createApp },
          ]}
        />
        <PageHeader title={t.oauth.createApp} description={t.oauth.createAppDesc} />
        <div className="p-4 md:py-6 lg:px-0 space-y-10">
          <SectionDivider />
          <div className="max-w-lg space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.oauth.appName} *</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg placeholder:text-subtle"
                placeholder={t.oauth.appNamePlaceholder}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">应用类型 *</label>
              <div className="grid grid-cols-2 gap-3">
                {APP_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAppType(type.value as any)}
                      className={`cursor-pointer p-3 rounded-xl border text-left transition-colors ${
                        appType === type.value
                          ? 'border-foreground bg-foreground/5'
                          : 'border-muted hover:bg-overlay-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted mt-1">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.oauth.descriptionOptional}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="flex w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg placeholder:text-subtle"
                placeholder="应用的详细描述（可选）"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.oauth.redirectUri} *</label>
              <textarea
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                rows={2}
                className="flex w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg placeholder:text-subtle font-mono"
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
          </div>
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
            { label: t.nav.oauth, href: '/dashboard/oauth' },
            { label: t.oauth.createApp },
          ]}
        />
        <PageHeader title={t.oauth.selectScopes} description={t.oauth.selectScopesDesc} />
        <div className="p-4 md:py-6 lg:px-0 space-y-10">
          <SectionDivider />
          <div className="max-w-lg space-y-6">
            <div className="space-y-3">
              {AVAILABLE_SCOPES.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => toggleScope(scope.id)}
                  disabled={scope.required}
                  className={`cursor-pointer w-full p-4 rounded-xl border text-left transition-colors ${
                    selectedScopes.has(scope.id)
                      ? 'border-foreground bg-foreground/5'
                      : 'border-muted hover:bg-overlay-hover'
                  } ${scope.required ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {scope.name}
                        {scope.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      <p className="text-xs text-muted mt-1">{scope.description}</p>
                    </div>
                    {selectedScopes.has(scope.id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {selectedScopes.has('offline_access') && (
              <div className="p-4 rounded-xl border border-muted">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issueRefreshToken}
                    onChange={(e) => setIssueRefreshToken(e.target.checked)}
                    className="h-4 w-4 rounded border-muted cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium">允许发放 Refresh Token</p>
                    <p className="text-xs text-muted mt-0.5">客户端级开关，需要 offline_access 范围</p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
              >
                {t.common.back}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {isCreating ? t.common.processing : t.oauth.createApp}
              </button>
            </div>
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
          { label: t.nav.oauth, href: '/dashboard/oauth' },
          { label: t.oauth.createApp },
        ]}
      />
      <PageHeader title={t.oauth.appCreated} description={t.oauth.appCreatedDesc} />
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <SectionDivider />
        <div className="max-w-lg space-y-6">
          {createdApp && (
            <div className="p-4 rounded-xl bg-surface-l1 border border-muted space-y-4">
              <div>
                <p className="text-xs text-muted mb-1">Client ID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm break-all">{createdApp.clientId}</code>
                  <DashboardCopyButton text={createdApp.clientId} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Client Secret</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm break-all">
                    {showSecret ? createdApp.clientSecret : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="cursor-pointer text-muted hover:text-primary transition-colors"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <DashboardCopyButton text={createdApp.clientSecret} />
                </div>
              </div>
            </div>
          )}
          
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {t.oauth.secretWarning}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => router.push('/dashboard/oauth')}
            className="cursor-pointer inline-flex items-center justify-center h-10 px-6 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            {t.common.done}
          </button>
        </div>
      </div>
    </>
  );
}
