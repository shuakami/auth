/**
 * OAuth 应用管理页面组件
 * 使用真实 API 数据
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Settings, Eye, EyeOff, Globe, Smartphone, Monitor, Server } from 'lucide-react';
import { PageHeader, DataCard, DashboardCopyButton } from '../shared';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useI18n } from '../../i18n';
import { useToast } from '@/components/ui/Toast';
import { useOAuth } from '../../hooks';
import type { OAuthApp, UpdateOAuthAppRequest } from '@/services/oauth';

// 应用类型图标
function AppTypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || 'h-4 w-4';
  switch (type) {
    case 'web': return <Globe className={cls} />;
    case 'mobile': return <Smartphone className={cls} />;
    case 'desktop': return <Monitor className={cls} />;
    case 'server': return <Server className={cls} />;
    default: return <Globe className={cls} />;
  }
}

// 应用类型标签
const TYPE_LABELS: Record<string, string> = {
  web: 'Web 应用',
  mobile: '移动应用',
  desktop: '桌面应用',
  server: '服务端应用',
};

export function OAuthTab() {
  const { t } = useI18n();
  const { toast } = useToast();

  const {
    apps,
    isLoading,
    isUpdating,
    visibleSecrets,
    updateApp,
    removeApp,
    toggleSecretVisibility,
  } = useOAuth();

  // 搜索
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤后的应用列表
  const filteredApps = apps.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.name.toLowerCase().includes(query) ||
      app.clientId.toLowerCase().includes(query) ||
      (app.description?.toLowerCase().includes(query))
    );
  });

  // 弹窗状态
  const [selectedApp, setSelectedApp] = useState<OAuthApp | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 编辑表单
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isActive: true,
    redirectUris: '',
  });

  // 打开应用详情
  const handleAppClick = (app: OAuthApp) => {
    setSelectedApp(app);
    setEditForm({
      name: app.name,
      description: app.description || '',
      isActive: app.isActive,
      redirectUris: app.redirectUris.join('\n'),
    });
    setIsEditing(false);
  };

  // 保存应用
  const handleSaveApp = async () => {
    if (!selectedApp) return;
    try {
      const updates: UpdateOAuthAppRequest = {};
      if (editForm.name !== selectedApp.name) updates.name = editForm.name;
      if (editForm.description !== (selectedApp.description || '')) updates.description = editForm.description;
      if (editForm.isActive !== selectedApp.isActive) updates.isActive = editForm.isActive;
      
      const newUris = editForm.redirectUris.split('\n').map(u => u.trim()).filter(Boolean);
      if (JSON.stringify(newUris) !== JSON.stringify(selectedApp.redirectUris)) {
        updates.redirectUris = newUris;
      }

      await updateApp(selectedApp.id, updates);
      toast(t.toast.appUpdated);
      setSelectedApp(null);
      setIsEditing(false);
    } catch (err: any) {
      toast(err.message || '更新失败');
    }
  };

  // 删除应用
  const handleDeleteApp = async (appId: string) => {
    try {
      await removeApp(appId);
      toast('应用已删除');
      setShowDeleteConfirm(null);
      setSelectedApp(null);
    } catch (err: any) {
      toast(err.message || '删除失败');
    }
  };

  return (
    <>
      <PageHeader title={t.oauth.title} description={t.oauth.description} />

      <div className="p-4 md:py-6 lg:px-0">
        <DataCard
          title={t.oauth.applications}
          description={t.oauth.applicationsDesc}
          searchPlaceholder={t.oauth.searchApps}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          action={
            <Link
              href="/dashboard/oauth/create"
              className="cursor-pointer inline-flex items-center justify-center gap-x-2 whitespace-nowrap font-medium transition-colors bg-foreground text-background hover:bg-foreground/90 h-7 px-3 text-xs rounded-full"
            >
              {t.common.create}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="w-full">
            <div className="flow-root">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors">
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[35%]">
                      {t.oauth.application}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[35%]">
                      {t.oauth.clientId}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[15%] whitespace-nowrap">
                      {t.oauth.usage}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[15%]" />
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {isLoading ? (
                    // 骨架屏
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-3 sm:px-5">
                          <div className="space-y-1.5">
                            <div className="h-4 w-32 rounded bg-muted/30 animate-pulse" />
                            <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
                          </div>
                        </td>
                        <td className="px-2 py-3 sm:px-5">
                          <div className="h-4 w-40 rounded bg-muted/30 animate-pulse" />
                        </td>
                        <td className="px-2 py-3 sm:px-5">
                          <div className="h-4 w-8 rounded bg-muted/30 animate-pulse" />
                        </td>
                        <td className="px-2 py-3 sm:px-5" />
                      </tr>
                    ))
                  ) : filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-muted">
                        {searchQuery ? '没有找到匹配的应用' : '还没有 OAuth 应用，点击上方按钮创建'}
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b transition-colors hover:bg-overlay-hover group cursor-pointer"
                        onClick={() => handleAppClick(app)}
                      >
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <AppTypeIcon type={app.type} className="h-4 w-4 text-subtle" />
                              <span className={`font-medium truncate ${app.isActive ? '' : 'text-muted'}`}>
                                {app.name}
                              </span>
                            </div>
                            {app.description && (
                              <span className="text-xs text-muted truncate">{app.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs text-muted truncate">{app.clientId}</code>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <DashboardCopyButton text={app.clientId} />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <span className="text-sm text-muted">{app.usageCount}</span>
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="cursor-pointer text-subtle hover:text-primary transition-colors"
                              title="Settings"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppClick(app);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DataCard>
      </div>

      {/* 应用详情/编辑弹窗 */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => {
          setSelectedApp(null);
          setIsEditing(false);
        }}
        title={isEditing ? '编辑应用' : (selectedApp?.name || '应用详情')}
        size="md"
      >
        {selectedApp && (
          <div className="space-y-5">
            {isEditing ? (
              // 编辑模式
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t.oauth.appName}</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t.oauth.descriptionOptional}</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="可选"
                    className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t.oauth.redirectUri}</label>
                  <textarea
                    value={editForm.redirectUris}
                    onChange={(e) => setEditForm({ ...editForm, redirectUris: e.target.value })}
                    rows={3}
                    placeholder="每行一个 URI"
                    className="flex w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t.users.status}</label>
                  <Select
                    value={editForm.isActive ? 'active' : 'disabled'}
                    onChange={(val) => setEditForm({ ...editForm, isActive: val === 'active' })}
                    options={[
                      { value: 'active', label: t.modals.active },
                      { value: 'disabled', label: t.common.disable },
                    ]}
                  />
                </div>
              </div>
            ) : (
              // 查看模式
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wide">{t.oauth.clientId}</label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <code className="flex-1 text-sm font-mono truncate">{selectedApp.clientId}</code>
                      <DashboardCopyButton text={selectedApp.clientId} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wide">{t.oauth.clientSecret}</label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <code className="flex-1 text-sm font-mono truncate">
                        {visibleSecrets.has(selectedApp.id) ? selectedApp.clientSecret : '••••••••••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleSecretVisibility(selectedApp.id)}
                        className="cursor-pointer text-muted hover:text-primary transition-colors"
                      >
                        {visibleSecrets.has(selectedApp.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <DashboardCopyButton text={selectedApp.clientSecret} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">类型</span>
                    <span className="flex items-center gap-1.5">
                      <AppTypeIcon type={selectedApp.type} className="h-3.5 w-3.5" />
                      {TYPE_LABELS[selectedApp.type] || selectedApp.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">{t.users.status}</span>
                    <span className={selectedApp.isActive ? '' : 'text-muted'}>
                      {selectedApp.isActive ? t.modals.active : t.common.disable}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">{t.oauth.authorizations}</span>
                    <span>{selectedApp.usageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">权限范围</span>
                    <span className="text-xs">{selectedApp.scopes.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">{t.users.created}</span>
                    <span>{new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleSaveApp}
                    disabled={isUpdating}
                    className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? t.common.processing : t.common.save}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
                  >
                    {t.common.edit}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedApp.id)}
                    className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    {t.common.delete}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="确认删除应用"
        size="sm"
      >
        <div className="space-y-5">
          <div className="text-sm text-muted space-y-2">
            <p>删除 OAuth 应用将会：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>立即停止所有使用该应用的认证服务</li>
              <li>使现有 access token 失效</li>
              <li>无法恢复应用配置和统计数据</li>
            </ul>
          </div>
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={() => showDeleteConfirm && handleDeleteApp(showDeleteConfirm)}
              disabled={isUpdating}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isUpdating ? t.common.processing : '确认删除'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
