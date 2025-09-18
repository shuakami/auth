'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type FormEvent,
} from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Smartphone,
  Monitor,
  Server,
  BookOpen,
  Shield
} from 'lucide-react';
import {
  getOAuthApps,
  createOAuthApp,
  updateOAuthApp,
  deleteOAuthApp,
  type OAuthApp,
  type CreateOAuthAppRequest,
  type UpdateOAuthAppRequest
} from '@/services/oauth';

// 动态导入 ConfirmModal
const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), { ssr: false });

// 组件状态
interface OAuthManagementState {
  apps: OAuthApp[];
  loading: boolean;
  error: string;
  showCreateForm: boolean;
  editingApp: OAuthApp | null;
  editingAppForm: Partial<CreateAppForm> | null;
  activeSettingsTab: 'general' | 'credentials' | 'guide' | 'danger';
  showDeleteConfirm: string | null;
  visibleSecrets: Set<string>;
  copiedSecrets: Set<string>;
}

// 新建应用表单
interface CreateAppForm {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'desktop' | 'server';
  redirectUris: string;
  scopes: string[];
  issueRefreshToken: boolean;
}

const initialState: OAuthManagementState = {
  apps: [],
  loading: true,
  error: '',
  showCreateForm: false,
  editingApp: null,
  editingAppForm: null,
  activeSettingsTab: 'general',
  showDeleteConfirm: null,
  visibleSecrets: new Set(),
  copiedSecrets: new Set(),
};

const initialForm: CreateAppForm = {
  name: '',
  description: '',
  type: 'web',
  redirectUris: '',
  scopes: ['openid', 'profile', 'email'],
  issueRefreshToken: false,
};

type StateAction = Partial<OAuthManagementState> & {
  type?: 'TOGGLE_SECRET' | 'COPY_SECRET' | 'CLEAR_COPY';
  appId?: string;
};

function stateReducer(state: OAuthManagementState, action: StateAction): OAuthManagementState {
  switch (action.type) {
    case 'TOGGLE_SECRET': {
      if (!action.appId) return state;
      const next = new Set(state.visibleSecrets);
      next.has(action.appId) ? next.delete(action.appId) : next.add(action.appId);
      return { ...state, visibleSecrets: next };
    }
    case 'COPY_SECRET': {
      if (!action.appId) return state;
      const next = new Set(state.copiedSecrets);
      next.add(action.appId);
      return { ...state, copiedSecrets: next };
    }
    case 'CLEAR_COPY': {
      if (!action.appId) return state;
      const next = new Set(state.copiedSecrets);
      next.delete(action.appId);
      return { ...state, copiedSecrets: next };
    }
    default:
      return { ...state, ...action };
  }
}

// 可用的OAuth作用域
const AVAILABLE_SCOPES = [
  { value: 'openid', label: 'OpenID Connect', required: true },
  { value: 'profile', label: '基本资料 (用户名、头像)', required: false },
  { value: 'email', label: '邮箱地址', required: false },
  { value: 'phone', label: '手机号码', required: false },
  { value: 'address', label: '地址信息', required: false },
  { value: 'offline_access', label: '离线访问 (发放Refresh Token)', required: false },
];

export default function OAuthManagement() {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  const [form, setForm] = useState<CreateAppForm>(initialForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 显示消息
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // 加载OAuth应用列表
  const loadApps = useCallback(async () => {
    dispatch({ loading: true, error: '' });
    try {
      const result = await getOAuthApps();
      dispatch({ apps: result.apps, loading: false });
    } catch (error: any) {
      dispatch({ loading: false, error: error?.response?.data?.error || error?.message || '加载OAuth应用失败' });
    }
  }, []);

  // 创建应用
  const handleCreateApp = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) return showMessage('error', '请输入应用名称');
    if (!form.redirectUris.trim()) return showMessage('error', '请输入重定向URI');

    try {
      const createRequest: CreateOAuthAppRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        redirectUris: form.redirectUris.split('\n').map(uri => uri.trim()).filter(Boolean),
        scopes: form.scopes,
        issueRefreshToken: form.issueRefreshToken,
      };
      await createOAuthApp(createRequest);
      await loadApps();
      dispatch({ showCreateForm: false });
      setForm(initialForm);
      showMessage('success', '应用创建成功！');
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || error?.message || '创建应用失败');
    }
  }, [form, showMessage, loadApps]);

  // 更新应用
  const handleUpdateApp = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!state.editingApp || !state.editingAppForm) return;
    try {
      const updateRequest: UpdateOAuthAppRequest = {
        name: state.editingAppForm.name?.trim(),
        description: state.editingAppForm.description?.trim(),
        redirectUris: state.editingAppForm.redirectUris?.split('\n').map(uri => uri.trim()).filter(Boolean),
        scopes: state.editingAppForm.scopes,
        issueRefreshToken: state.editingAppForm.issueRefreshToken,
      };
      await updateOAuthApp(state.editingApp.id, updateRequest);
      await loadApps();
      dispatch({ editingApp: null, editingAppForm: null });
      showMessage('success', '应用更新成功');
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || '更新失败');
    }
  }, [state.editingApp, state.editingAppForm, showMessage, loadApps]);

  // 删除应用
  const handleDeleteApp = useCallback(async (appId: string) => {
    try {
      await deleteOAuthApp(appId);
      await loadApps();
      dispatch({ showDeleteConfirm: null });
      showMessage('success', '应用删除成功');
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || error?.message || '删除失败');
    }
  }, [showMessage, loadApps]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string, appId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch({ type: 'COPY_SECRET', appId });
      setTimeout(() => dispatch({ type: 'CLEAR_COPY', appId }), 2000);
    } catch {
      showMessage('error', '复制失败');
    }
  }, [showMessage]);

  // 应用类型图标/标签
  const getTypeIcon = useCallback((type: string) => {
    const cls = 'w-4 h-4';
    switch (type) {
      case 'web': return <Globe className={cls} />;
      case 'mobile': return <Smartphone className={cls} />;
      case 'desktop': return <Monitor className={cls} />;
      case 'server': return <Server className={cls} />;
      default: return <Globe className={cls} />;
    }
  }, []);
  const getTypeLabel = useCallback((type: string) => {
    const labels = { web: 'Web应用', mobile: '移动应用', desktop: '桌面应用', server: '服务端应用' };
    return labels[type as keyof typeof labels] || type;
  }, []);

  // 初始化
  useEffect(() => { loadApps(); }, [loadApps]);

  // 骨架屏
  const AppsSkeleton = () => (
    <div className="divide-y divide-black/5 dark:divide-white/10">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="py-4">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
              <div className="h-8 w-16 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-6 w-full rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-6 w-full rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  // 列表
  const renderAppList = useMemo(() => {
    if (state.loading) return <AppsSkeleton />;

    if (state.error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-zinc-500">
              <Shield className="h-full w-full" />
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          </div>
        </div>
      );
    }

    if (state.apps.length === 0) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 text-neutral-400 dark:text-zinc-500">
              <Shield className="h-full w-full" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-neutral-900 dark:text-neutral-100">还没有 OAuth 应用</h3>
            <p className="mb-4 text-sm text-neutral-500 dark:text-zinc-400">创建你的第一个应用以集成登录</p>
            <Button onClick={() => dispatch({ showCreateForm: true })}>
              <Plus className="mr-2 h-4 w-4" />
              创建应用
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="divide-y divide-black/5 dark:divide-white/10">
        {state.apps.map((app) => (
          <div key={app.id} className="py-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded bg-black/[0.04] p-1.5 text-neutral-600 dark:bg-white/[0.06] dark:text-zinc-300">
                  {getTypeIcon(app.type)}
                </div>
                <div>
                  <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">{app.name}</h3>
                  <div className="mt-0.5 flex items-center gap-3">
                    <span className="text-xs text-neutral-500 dark:text-zinc-400">{getTypeLabel(app.type)}</span>
                    <span className={`text-xs ${app.isActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                      {app.isActive ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    dispatch({
                      editingApp: app,
                      activeSettingsTab: 'general',
                      editingAppForm: {
                        name: app.name,
                        description: app.description || '',
                        redirectUris: app.redirectUris.join('\n'),
                        scopes: app.scopes,
                        issueRefreshToken: app.issueRefreshToken,
                      },
                    })
                  }
                  className="h-8 px-3"
                >
                  <Settings className="mr-1.5 h-4 w-4" />
                  设置
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dispatch({ showDeleteConfirm: app.id })}
                  className="h-8 px-3 text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>

            {app.description && (
              <p className="mb-3 text-sm text-neutral-600 dark:text-zinc-400">{app.description}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-zinc-500">Client ID</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {app.clientId}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(app.clientId, app.id)}
                    className="h-7 w-7 p-0"
                    aria-label="复制 Client ID"
                  >
                    {state.copiedSecrets.has(app.id) ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-zinc-500">Client Secret</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {state.visibleSecrets.has(app.id) ? app.clientSecret : '••••••••••••••••'}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'TOGGLE_SECRET', appId: app.id })}
                    className="h-7 w-7 p-0"
                    aria-label="切换 Client Secret 可见性"
                  >
                    {state.visibleSecrets.has(app.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(app.clientSecret, app.id)}
                    className="h-7 w-7 p-0"
                    aria-label="复制 Client Secret"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-zinc-400">
              <div className="flex items-center gap-4">
                <span>使用 {app.usageCount} 次</span>
                <span>范围: {app.scopes.join(', ')}</span>
              </div>
              <span>{new Date(app.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [state.apps, state.loading, state.error, state.visibleSecrets, state.copiedSecrets, getTypeIcon, getTypeLabel, copyToClipboard]);

  return (
    <div className="space-y-6">
      {/* 标题与操作 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">OAuth 应用管理</h3>
          <p className="text-sm text-neutral-600 dark:text-zinc-400">管理 OAuth2/OIDC 应用与凭证</p>
        </div>
        <Button onClick={() => dispatch({ showCreateForm: true })}>
          <Plus className="mr-2 h-4 w-4" />
          创建应用
        </Button>
      </div>

      {/* 消息 */}
      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-300/50 bg-emerald-50/60 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'border-red-300/50 bg-red-50/60 text-red-700 dark:border-red-600/40 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 应用列表 */}
      {renderAppList}

      {/* 创建应用模态框 */}
      <ConfirmModal
        isOpen={state.showCreateForm}
        onClose={() => dispatch({ showCreateForm: false })}
        onConfirm={handleCreateApp}
        title="创建 OAuth 应用"
        message={
          <form className="space-y-4" onSubmit={handleCreateApp}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">应用名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                  placeholder="我的应用"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">应用类型 *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                >
                  <option value="web">Web应用</option>
                  <option value="mobile">移动应用</option>
                  <option value="desktop">桌面应用</option>
                  <option value="server">服务端应用</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">应用描述</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                placeholder="应用的详细描述（可选）"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">重定向 URI *</label>
              <textarea
                value={form.redirectUris}
                onChange={(e) => setForm({ ...form, redirectUris: e.target.value })}
                required
                rows={2}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                placeholder="https://example.com/auth/callback"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">每行一个 URI</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">权限范围</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label key={scope.value} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(scope.value)}
                      onChange={(e) => {
                        if (scope.required) return;
                        const newScopes = e.target.checked
                          ? [...form.scopes, scope.value]
                          : form.scopes.filter(s => s !== scope.value);
                        const offline = newScopes.includes('offline_access');
                        setForm({ ...form, scopes: newScopes, issueRefreshToken: offline ? form.issueRefreshToken : false });
                      }}
                      disabled={scope.required}
                      className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                    />
                    <span className="ml-2 text-neutral-700 dark:text-zinc-300">
                      {scope.label}{scope.required && <span className="ml-1 text-red-500">*</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className={`flex items-center text-sm ${!form.scopes.includes('offline_access') ? 'cursor-not-allowed opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.issueRefreshToken}
                  onChange={(e) => setForm({ ...form, issueRefreshToken: e.target.checked })}
                  disabled={!form.scopes.includes('offline_access')}
                  className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                />
                <span className="ml-2 text-neutral-700 dark:text-zinc-300">允许发放 Refresh Token (客户端级开关)</span>
              </label>
              <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">需先选择 “offline_access”。</p>
            </div>
          </form>
        }
        type="default"
        confirmText="创建应用"
        cancelText="取消"
      />

      {/* 应用设置模态框 */}
      <ConfirmModal
        isOpen={!!state.editingApp}
        onClose={() => dispatch({ editingApp: null, editingAppForm: null })}
        title="应用设置"
        type="default"
        confirmText="保存更改"
        cancelText="取消"
        onConfirm={handleUpdateApp}
        className="max-w-7xl"
        message={
          state.editingApp && state.editingAppForm && (
            <div className="text-left">
              <div className="mb-4 border-b border-black/5 dark:border-white/10">
                <nav className="-mb-px flex gap-6" aria-label="Tabs">
                  {(['general', 'credentials', 'guide', 'danger'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => dispatch({ activeSettingsTab: tab })}
                      className={`whitespace-nowrap px-1 py-3 text-sm font-medium ${
                        state.activeSettingsTab === tab
                          ? (tab === 'danger'
                              ? 'border-b-2 border-red-600 text-red-600'
                              : 'border-b-2 border-black text-black dark:border-white dark:text-white')
                          : (tab === 'danger'
                              ? 'text-neutral-500 hover:text-red-600'
                              : 'text-neutral-500 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-zinc-200')
                      }`}
                    >
                      {tab === 'general' && '常规设置'}
                      {tab === 'credentials' && '应用凭证'}
                      {tab === 'guide' && '集成指南'}
                      {tab === 'danger' && '危险区域'}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="max-h-[65vh] overflow-y-auto pr-1">
                {state.activeSettingsTab === 'general' && (
                  <form className="space-y-4" onSubmit={handleUpdateApp}>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">应用名称</label>
                      <input
                        type="text"
                        value={state.editingAppForm.name}
                        onChange={(e) => dispatch({ editingAppForm: { ...state.editingAppForm, name: e.target.value } })}
                        className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">应用描述</label>
                      <textarea
                        value={state.editingAppForm.description}
                        onChange={(e) => dispatch({ editingAppForm: { ...state.editingAppForm, description: e.target.value } })}
                        rows={3}
                        className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">重定向 URI</label>
                      <textarea
                        value={state.editingAppForm.redirectUris}
                        onChange={(e) => dispatch({ editingAppForm: { ...state.editingAppForm, redirectUris: e.target.value } })}
                        rows={3}
                        className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">每行一个 URI</p>
                    </div>

                    <div className="pt-2">
                      <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">权限范围</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {AVAILABLE_SCOPES.map((scope) => (
                          <label key={scope.value} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={!!state.editingAppForm!.scopes?.includes(scope.value)}
                              onChange={(e) => {
                                if (scope.required) return;
                                const current = state.editingAppForm!.scopes || [];
                                const next = e.target.checked ? [...current, scope.value] : current.filter(s => s !== scope.value);
                                const offline = next.includes('offline_access');
                                dispatch({
                                  editingAppForm: {
                                    ...state.editingAppForm!,
                                    scopes: next,
                                    issueRefreshToken: offline ? state.editingAppForm!.issueRefreshToken : false,
                                  },
                                });
                              }}
                              disabled={scope.required}
                              className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                            />
                            <span className="ml-2 text-neutral-700 dark:text-zinc-300">{scope.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <label className={`flex items-center text-sm ${!state.editingAppForm!.scopes?.includes('offline_access') ? 'cursor-not-allowed opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!!state.editingAppForm.issueRefreshToken}
                          onChange={(e) => dispatch({ editingAppForm: { ...state.editingAppForm!, issueRefreshToken: e.target.checked } })}
                          disabled={!state.editingAppForm!.scopes?.includes('offline_access')}
                          className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                        />
                        <span className="ml-2 text-neutral-700 dark:text-zinc-300">允许发放 Refresh Token</span>
                      </label>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">需要 `offline_access` 范围。</p>
                    </div>
                  </form>
                )}

                {state.activeSettingsTab === 'credentials' && state.editingApp && (
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400">
                      以下为应用凭证，请妥善保管。Client Secret 仅在此处可见。
                    </p>
                    <div>
                      <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-zinc-500">Client ID</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {state.editingApp.clientId}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(state.editingApp!.clientId, state.editingApp!.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-neutral-500 dark:text-zinc-500">Client Secret</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all rounded bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {state.visibleSecrets.has(state.editingApp.id) ? state.editingApp.clientSecret : '••••••••••••••••'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dispatch({ type: 'TOGGLE_SECRET', appId: state.editingApp!.id })}
                          className="h-7 w-7 p-0"
                        >
                          {state.visibleSecrets.has(state.editingApp.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(state.editingApp!.clientSecret, state.editingApp!.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {state.activeSettingsTab === 'guide' && state.editingApp && (
                  <div className="text-sm text-neutral-700 dark:text-zinc-300">
                    <div className="py-8 text-center">
                      <BookOpen className="mx-auto mb-4 h-14 w-14 text-neutral-700 dark:text-zinc-200" />
                      <h4 className="mb-2 text-lg font-semibold">完整集成指南</h4>
                      <p className="mx-auto mb-6 max-w-2xl text-neutral-600 dark:text-zinc-400">
                        我们提供 OAuth2/OIDC 集成文档、示例与最佳实践，帮助你快速完成对接。
                      </p>
                      <a
                        href="/oauth/integration-guide"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-3 font-medium text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        <BookOpen className="h-5 w-5" />
                        查看集成指南
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="mt-6 grid gap-4 text-xs md:grid-cols-2">
                      <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
                        <h5 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">快速参考</h5>
                        <div className="space-y-1 text-neutral-700 dark:text-zinc-300">
                          <div>• 授权端点: <code>/oauth/authorize</code></div>
                          <div>• 令牌端点: <code>/oauth/token</code></div>
                          <div>• 用户信息: <code>/oauth/userinfo</code></div>
                          <div>• Client ID: <code>{state.editingApp.clientId}</code></div>
                        </div>
                      </div>

                      <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
                        <h5 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">包含内容</h5>
                        <div className="space-y-1 text-neutral-700 dark:text-zinc-300">
                          <div>• 完整 OAuth2 流程详解</div>
                          <div>• 多语言代码示例</div>
                          <div>• PKCE 与安全最佳实践</div>
                          <div>• 故障排除与调试指南</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {state.activeSettingsTab === 'danger' && state.editingApp && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-red-600">删除此应用</h4>
                    <p className="text-sm text-neutral-600 dark:text-zinc-400">
                      一旦删除，所有使用该应用的认证将立即失效，且不可恢复。
                    </p>
                    <Button
                      variant="error"
                      onClick={() => {
                        dispatch({ showDeleteConfirm: state.editingApp!.id, editingApp: null, editingAppForm: null });
                      }}
                    >
                      删除应用
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        }
      />

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={!!state.showDeleteConfirm}
        onClose={() => dispatch({ showDeleteConfirm: null })}
        onConfirm={() => { if (state.showDeleteConfirm) handleDeleteApp(state.showDeleteConfirm); }}
        title="确认删除应用"
        message={
          <div className="space-y-3 text-sm">
            <p className="text-neutral-600 dark:text-zinc-400">删除 OAuth 应用将会：</p>
            <ul className="list-inside list-disc space-y-1 text-neutral-600 dark:text-zinc-400">
              <li>立即停止所有使用该应用的认证服务</li>
              <li>使现有 access token 失效</li>
              <li>无法恢复应用配置和统计数据</li>
            </ul>
            <p className="font-medium text-red-600 dark:text-red-400">此操作无法撤销，请谨慎操作。</p>
          </div>
        }
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}
