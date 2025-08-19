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
import LoadingIndicator from '@/components/ui/LoadingIndicator';
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
  Code,
  BookOpen,
  Shield
} from 'lucide-react';
import {
  getOAuthApps,
  createOAuthApp,
  updateOAuthApp,
  deleteOAuthApp,
  type OAuthApp,
  type CreateOAuthAppRequest
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
}

const initialState: OAuthManagementState = {
  apps: [],
  loading: true,
  error: '',
  showCreateForm: false,
  editingApp: null,
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
};

type StateAction = Partial<OAuthManagementState> & {
  type?: 'TOGGLE_SECRET' | 'COPY_SECRET' | 'CLEAR_COPY';
  appId?: string;
};

function stateReducer(state: OAuthManagementState, action: StateAction): OAuthManagementState {
  switch (action.type) {
    case 'TOGGLE_SECRET':
      if (!action.appId) return state;
      const newVisible = new Set(state.visibleSecrets);
      if (newVisible.has(action.appId)) {
        newVisible.delete(action.appId);
      } else {
        newVisible.add(action.appId);
      }
      return { ...state, visibleSecrets: newVisible };

    case 'COPY_SECRET':
      if (!action.appId) return state;
      const newCopied = new Set(state.copiedSecrets);
      newCopied.add(action.appId);
      return { ...state, copiedSecrets: newCopied };

    case 'CLEAR_COPY':
      if (!action.appId) return state;
      const clearCopied = new Set(state.copiedSecrets);
      clearCopied.delete(action.appId);
      return { ...state, copiedSecrets: clearCopied };

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
      dispatch({ 
        loading: false, 
        error: error.response?.data?.error || error.message || '加载OAuth应用失败' 
      });
    }
  }, []);

  // 创建应用
  const handleCreateApp = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    
    if (!form.name.trim()) {
      showMessage('error', '请输入应用名称');
      return;
    }

    if (!form.redirectUris.trim()) {
      showMessage('error', '请输入重定向URI');
      return;
    }

    try {
      const createRequest: CreateOAuthAppRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        redirectUris: form.redirectUris.split('\n').map(uri => uri.trim()).filter(Boolean),
        scopes: form.scopes,
      };

      const result = await createOAuthApp(createRequest);
      
      // 重新加载应用列表
      await loadApps();
      
      dispatch({ showCreateForm: false });
      setForm(initialForm);
      showMessage('success', '应用创建成功！');
      
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || error.message || '创建应用失败');
    }
  }, [form, showMessage, loadApps]);

  // 删除应用
  const handleDeleteApp = useCallback(async (appId: string) => {
    try {
      await deleteOAuthApp(appId);
      
      // 重新加载应用列表
      await loadApps();
      
      dispatch({ showDeleteConfirm: null });
      showMessage('success', '应用删除成功');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || error.message || '删除失败');
    }
  }, [showMessage, loadApps]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string, appId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch({ type: 'COPY_SECRET', appId });
      setTimeout(() => {
        dispatch({ type: 'CLEAR_COPY', appId });
      }, 2000);
    } catch (error) {
      showMessage('error', '复制失败');
    }
  }, [showMessage]);

  // 应用类型图标
  const getTypeIcon = useCallback((type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'web':
        return <Globe className={iconClass} />;
      case 'mobile':
        return <Smartphone className={iconClass} />;
      case 'desktop':
        return <Monitor className={iconClass} />;
      case 'server':
        return <Server className={iconClass} />;
      default:
        return <Globe className={iconClass} />;
    }
  }, []);

  // 应用类型标签
  const getTypeLabel = useCallback((type: string) => {
    const labels = {
      web: 'Web应用',
      mobile: '移动应用',
      desktop: '桌面应用',
      server: '服务端应用'
    };
    return labels[type as keyof typeof labels] || type;
  }, []);

  // 初始化
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // 渲染骨架屏
  const AppsSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              <div className="h-6 w-full bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            </div>
            <div className="space-y-1">
              <div className="h-3 w-20 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              <div className="h-6 w-full bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染应用列表
  const renderAppList = useMemo(() => {
    if (state.loading) {
      return <AppsSkeleton />;
    }

    if (state.error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-neutral-400 dark:text-zinc-500 mb-4">
              <Shield className="w-full h-full" />
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
            <div className="mx-auto h-16 w-16 text-neutral-400 dark:text-zinc-500 mb-4">
              <Shield className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              还没有OAuth应用
            </h3>
            <p className="text-sm text-neutral-500 dark:text-zinc-400 mb-4">
              创建您的第一个OAuth应用，开始集成单点登录功能
            </p>
            <Button onClick={() => dispatch({ showCreateForm: true })}>
              <Plus className="w-4 h-4 mr-2" />
              创建应用
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {state.apps.map((app) => (
          <div key={app.id} className="rounded-lg border border-neutral-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-500">
                    {getTypeIcon(app.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                      {app.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-neutral-500 dark:text-zinc-400">
                        {getTypeLabel(app.type)}
                      </span>
                      <span className={`text-xs ${
                        app.isActive
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-red-600 dark:text-red-500'
                      }`}>
                        {app.isActive ? '已启用' : '已禁用'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ editingApp: app })}
                    className="h-8 px-3"
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    设置
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ showDeleteConfirm: app.id })}
                    className="h-8 px-3 text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    删除
                  </Button>
                </div>
              </div>

              {app.description && (
                <p className="text-sm text-neutral-600 dark:text-zinc-400 mb-3">
                  {app.description}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-neutral-500 dark:text-zinc-500 mb-1">
                    Client ID
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-neutral-50 px-2 py-1.5 text-xs font-mono text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300 truncate">
                      {app.clientId}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(app.clientId, app.id)}
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      {state.copiedSecrets.has(app.id) ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-neutral-500 dark:text-zinc-500 mb-1">
                    Client Secret
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-neutral-50 px-2 py-1.5 text-xs font-mono text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {state.visibleSecrets.has(app.id) ? app.clientSecret : '••••••••••••••••'}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dispatch({ type: 'TOGGLE_SECRET', appId: app.id })}
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      {state.visibleSecrets.has(app.id) ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(app.clientSecret, app.id)}
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
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
          </div>
        ))}
      </div>
    );
  }, [state.apps, state.loading, state.error, state.visibleSecrets, state.copiedSecrets, getTypeIcon, getTypeLabel, copyToClipboard]);

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            OAuth应用管理
          </h3>
          <p className="text-sm text-neutral-600 dark:text-zinc-400">
            管理OAuth2/OIDC应用，实现第三方系统的单点登录集成
          </p>
        </div>
        
        <Button onClick={() => dispatch({ showCreateForm: true })}>
          <Plus className="w-4 h-4 mr-2" />
          创建应用
        </Button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
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
        title="创建OAuth应用"
        message={
          <form className="space-y-4" onSubmit={handleCreateApp}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  应用名称 *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
                  placeholder="我的应用"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  应用类型 *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
                >
                  <option value="web">Web应用</option>
                  <option value="mobile">移动应用</option>
                  <option value="desktop">桌面应用</option>
                  <option value="server">服务端应用</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                应用描述
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
                placeholder="应用的详细描述（可选）"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                重定向URI *
              </label>
              <textarea
                value={form.redirectUris}
                onChange={(e) => setForm({ ...form, redirectUris: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
                placeholder="https://example.com/auth/callback"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">
                每行一个URI
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                权限范围
              </label>
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
                        setForm({ ...form, scopes: newScopes });
                      }}
                      disabled={scope.required}
                      className="w-4 h-4 text-black bg-neutral-100 border-neutral-300 rounded focus:ring-neutral-500 dark:focus:ring-neutral-600 dark:ring-offset-gray-800 dark:bg-neutral-700 dark:border-neutral-600"
                    />
                    <span className="ml-2 text-neutral-700 dark:text-zinc-300">
                      {scope.label}
                      {scope.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </label>
                ))}
              </div>
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
        onClose={() => dispatch({ editingApp: null })}
        onConfirm={() => dispatch({ editingApp: null })}
        title={`${state.editingApp?.name || ''} - 集成指南`}
        message={
          state.editingApp && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* 快速开始 */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  🚀 快速开始
                </h4>
                <div className="rounded-lg bg-neutral-50 dark:bg-zinc-800/50 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-700 dark:text-zinc-300 mb-1">Client ID</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-mono text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700">
                        {state.editingApp.clientId}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(state.editingApp!.clientId, state.editingApp!.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-700 dark:text-zinc-300 mb-1">Client Secret</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-mono text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700">
                        {state.visibleSecrets.has(state.editingApp.id) ? state.editingApp.clientSecret : '••••••••••••••••'}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dispatch({ type: 'TOGGLE_SECRET', appId: state.editingApp!.id })}
                        className="h-7 w-7 p-0"
                      >
                        {state.visibleSecrets.has(state.editingApp.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(state.editingApp!.clientSecret, state.editingApp!.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 集成步骤 */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  📝 集成步骤
                </h4>
                
                {/* 步骤 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
                      1
                    </div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">配置授权 URL</span>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400 mb-2">
                      将用户重定向到以下 URL 开始 OAuth 流程：
                    </p>
                    <div className="rounded bg-neutral-100 dark:bg-zinc-800 p-3 text-xs font-mono text-neutral-700 dark:text-zinc-300 overflow-x-auto">
                      {`${window.location.origin}/oauth/authorize?client_id=${state.editingApp.clientId}&response_type=code&scope=${state.editingApp.scopes.join('%20')}&redirect_uri=YOUR_REDIRECT_URI`}
                    </div>
                  </div>
                </div>

                {/* 步骤 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
                      2
                    </div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">处理授权回调</span>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400 mb-2">
                      用户授权后会重定向到您的回调 URL，携带授权码：
                    </p>
                    <div className="rounded bg-neutral-100 dark:bg-zinc-800 p-3 text-xs font-mono text-neutral-700 dark:text-zinc-300">
                      {`${state.editingApp.redirectUris[0] || 'YOUR_REDIRECT_URI'}?code=AUTHORIZATION_CODE`}
                    </div>
                  </div>
                </div>

                {/* 步骤 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
                      3
                    </div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">交换访问令牌</span>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400 mb-2">
                      使用授权码换取访问令牌：
                    </p>
                    <div className="rounded bg-neutral-100 dark:bg-zinc-800 p-3 text-xs font-mono text-neutral-700 dark:text-zinc-300 space-y-2">
                      <div>POST {window.location.origin}/oauth/token</div>
                      <div>Content-Type: application/x-www-form-urlencoded</div>
                      <div className="mt-2">
                        grant_type=authorization_code<br/>
                        code=AUTHORIZATION_CODE<br/>
                        client_id={state.editingApp.clientId}<br/>
                        client_secret=YOUR_CLIENT_SECRET<br/>
                        redirect_uri=YOUR_REDIRECT_URI
                      </div>
                    </div>
                  </div>
                </div>

                {/* 步骤 4 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
                      4
                    </div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">获取用户信息</span>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400 mb-2">
                      使用访问令牌获取用户信息：
                    </p>
                    <div className="rounded bg-neutral-100 dark:bg-zinc-800 p-3 text-xs font-mono text-neutral-700 dark:text-zinc-300 space-y-2">
                      <div>GET {window.location.origin}/oauth/userinfo</div>
                      <div>Authorization: Bearer YOUR_ACCESS_TOKEN</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 代码示例 */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  💻 代码示例
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-700 dark:text-zinc-300 mb-2">JavaScript (Node.js)</div>
                    <div className="rounded bg-neutral-900 dark:bg-zinc-900 p-4 text-xs font-mono text-green-400 overflow-x-auto">
{`// 步骤 1: 重定向到授权页面
const authUrl = \`${window.location.origin}/oauth/authorize?\` +
  \`client_id=${state.editingApp.clientId}&\` +
  \`response_type=code&\` +
  \`scope=${state.editingApp.scopes.join('%20')}&\` +
  \`redirect_uri=\${encodeURIComponent(redirectUri)}\`;

// 步骤 2: 交换访问令牌
const response = await fetch('${window.location.origin}/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: '${state.editingApp.clientId}',
    client_secret: 'YOUR_CLIENT_SECRET',
    redirect_uri: redirectUri
  })
});

const tokens = await response.json();

// 步骤 3: 获取用户信息
const userResponse = await fetch('${window.location.origin}/oauth/userinfo', {
  headers: { 'Authorization': \`Bearer \${tokens.access_token}\` }
});

const userInfo = await userResponse.json();`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 安全提示 */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  🔒 安全最佳实践
                </h4>
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                    <li>• 始终验证重定向 URI 与注册的 URI 匹配</li>
                    <li>• 在服务器端安全存储 Client Secret，不要暴露在前端</li>
                    <li>• 使用 HTTPS 进行所有 OAuth 通信</li>
                    <li>• 实施适当的速率限制和访问控制</li>
                    <li>• 定期轮换 Client Secret</li>
                  </ul>
                </div>
              </div>

              {/* 测试工具 */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  🧪 测试集成
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const testUrl = `${window.location.origin}/oauth/authorize?client_id=${state.editingApp?.clientId}&response_type=code&scope=${state.editingApp?.scopes.join('%20')}&redirect_uri=${encodeURIComponent(state.editingApp?.redirectUris[0] || '')}`;
                      window.open(testUrl, '_blank');
                    }}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    测试授权流程
                  </Button>
                  <p className="text-xs text-neutral-500 dark:text-zinc-500">
                    点击上面的按钮可以测试完整的 OAuth 流程
                  </p>
                </div>
              </div>
            </div>
          )
        }
        type="default"
        confirmText="关闭"
        cancelText=""
      />

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={!!state.showDeleteConfirm}
        onClose={() => dispatch({ showDeleteConfirm: null })}
        onConfirm={() => {
          if (state.showDeleteConfirm) {
            handleDeleteApp(state.showDeleteConfirm);
          }
        }}
        title="确认删除应用"
        message={
          <div className="space-y-3">
            <p className="text-sm text-neutral-600 dark:text-zinc-400">
              删除OAuth应用将会：
            </p>
            <ul className="text-sm text-neutral-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li>立即停止所有使用该应用的认证服务</li>
              <li>使现有的access token失效</li>
              <li>无法恢复应用配置和统计数据</li>
            </ul>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              此操作无法撤销，请谨慎操作。
            </p>
          </div>
        }
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}