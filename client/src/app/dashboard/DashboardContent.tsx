'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import Header from './components/Header';
import Footer from './components/Footer';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import LocalLoadingSpinner from './components/LocalLoadingSpinner';
import { useAuth } from '@/context/AuthContext';

import {
  deleteAccount,
  disable2FA,
  generateBackupCodes,
  getRemainingBackupCodes,
  setup2FA,
  updateEmail,
  updatePassword,
  updateUsername,
  verify2FA,
} from '@/services/api';
import { checkAdminPermission } from '@/services/admin';

import {
  Settings,
  Shield,
  Key,
  User,
  Mail,
  Github,
  Chrome,
  Users,
  KeySquare,
  Trash2,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from './DashboardUI';
import {
  GeneralSection,
  SecuritySection,
  ConnectionsSection,
} from './DashboardSections';

// 动态导入 ConfirmModal（按需挂载）
const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), {
  ssr: false,
});

// 动态导入管理模块
const UserManagement = dynamic(() => import('./components/UserManagement'), {
  ssr: false,
  loading: () => <LocalLoadingSpinner />,
});
const OAuthManagement = dynamic(() => import('./components/OAuthManagement'), {
  ssr: false,
  loading: () => <LocalLoadingSpinner />,
});

/* -------------------------------------------------------------------------- */
/* 小工具：错误信息抽取 & 统一弹窗打开                                         */
/* -------------------------------------------------------------------------- */

function getErrMsg(err: unknown, fallback = '操作失败'): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const res = (err as { response?: { data?: { error?: string } } }).response;
    if (res?.data?.error && typeof res.data.error === 'string') return res.data.error;
  }
  return fallback;
}

type ModalKey =
  | 'pwd'
  | 'setup2faPwd'
  | 'totp'
  | 'backupCodes'
  | 'genBackupPwd'
  | 'disable2fa'
  | 'username'
  | 'email'
  | 'delete';

type ModalState = Record<ModalKey, boolean>;

function modalReducer(state: ModalState, action: { type: 'open' | 'close'; key: ModalKey }): ModalState {
  return { ...state, [action.key]: action.type === 'open' };
}

type SectionKey = 'general' | 'security' | 'connections' | 'admin' | 'oauth' | 'danger';

/* -------------------------------------------------------------------------- */
/* 组件                                                                       */
/* -------------------------------------------------------------------------- */

interface FormState {
  oldPwd: string;
  newPwd: string;
  pwdMsg: string;
  pwdLoading: boolean;
  setup2faPwd: string;
  setup2faPwdMsg: string;
  qr: string;
  secret: string;
  backupCodes: string[];
  totpToken: string;
  totpMsg: string;
  totpLoading: boolean;
  backupCount: number | null;
  backupMsg: string;
  genBackupPwd: string;
  genBackupPwdMsg: string;
  disableBackupCode: string;
  disable2faLoading: boolean;
  disable2faMsg: string;
  newUsername: string;
  usernameMsg: string;
  usernameLoading: boolean;
  newEmail: string;
  emailPwd: string;
  emailMsg: string;
  emailLoading: boolean;
  deletePwd: string;
  deleteCode: string;
  deleteLoading: boolean;
  deleteMsg: string;
  showUserId: boolean;
}

export default function DashboardContent() {
  const { user, logout, checkAuth } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();

  // 更稳健的定时器引用类型（兼容浏览器/Node）
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* --------------------------- URL 同步的 tab ----------------------------- */
  const [isAdmin, setIsAdmin] = useReducer((_: boolean, next: boolean) => next, false);
  useEffect(() => {
    checkAdminPermission()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [user]);

  const baseTabs: Array<{
    id: SectionKey;
    name: string;
    icon: any;
    title: string;
    description: string;
    danger?: boolean;
    adminOnly?: boolean;
  }> = [
    { id: 'general', name: '基本设置', icon: Settings, title: '基本设置', description: '管理你的基础资料与偏好' },
    { id: 'security', name: '安全与登录', icon: Shield, title: '安全与登录', description: '两步验证、会话与生物认证' },
    { id: 'connections', name: '账号绑定', icon: Key, title: '账号绑定', description: '绑定第三方账号以便快速登录' },
    { id: 'oauth', name: 'OAuth 应用', icon: KeySquare, title: 'OAuth 应用', description: '管理 OAuth2/OIDC 应用与凭证', adminOnly: true },
    { id: 'admin', name: '用户管理', icon: Users, title: '用户管理', description: '系统用户与权限管理', adminOnly: true },
    { id: 'danger', name: '危险操作', icon: Trash2, title: '危险操作', description: '这些操作不可撤销，请谨慎执行', danger: true },
  ];
  const tabs = baseTabs.filter(t => (t.adminOnly ? isAdmin : true));

  const urlTab = (searchParams.get('tab') as SectionKey | null) || null;
  const defaultTab: SectionKey = 'general';
  const activeTab: SectionKey = urlTab && tabs.some(t => t.id === urlTab) ? urlTab : defaultTab;
  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  const handleTabChange = (tabId: SectionKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tabId);
    router.replace(`/dashboard?${sp.toString()}`, { scroll: false });
  };

  /* --------------------------- 移动端检测（可选） ------------------------- */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const apply = () => setIsMobile(mql.matches);
    apply();
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else {
      // Safari/旧 WebView
      // @ts-ignore
      mql.addListener(onChange);
      return () => {
        // @ts-ignore
        mql.removeListener(onChange);
      };
    }
  }, []);

  /* --------------------------- 全局 modal state -------------------------- */
  const [modalOpen, setModalOpen] = useReducer(modalReducer, {
    pwd: false,
    setup2faPwd: false,
    totp: false,
    backupCodes: false,
    genBackupPwd: false,
    disable2fa: false,
    username: false,
    email: false,
    delete: false,
  });
  const openModal = useCallback((key: ModalKey) => setModalOpen({ type: 'open', key }), []);
  const closeModal = useCallback((key: ModalKey) => setModalOpen({ type: 'close', key }), []);

  /* --------------------------- 全局 form state --------------------------- */
  const [form, setForm] = useReducer(
    (s: FormState, p: Partial<FormState>) => ({ ...s, ...p }),
    {
      oldPwd: '',
      newPwd: '',
      pwdMsg: '',
      pwdLoading: false,
      setup2faPwd: '',
      setup2faPwdMsg: '',
      qr: '',
      secret: '',
      backupCodes: [],
      totpToken: '',
      totpMsg: '',
      totpLoading: false,
      backupCount: null,
      backupMsg: '',
      genBackupPwd: '',
      genBackupPwdMsg: '',
      disableBackupCode: '',
      disable2faLoading: false,
      disable2faMsg: '',
      newUsername: '',
      usernameMsg: '',
      usernameLoading: false,
      newEmail: '',
      emailPwd: '',
      emailMsg: '',
      emailLoading: false,
      deletePwd: '',
      deleteCode: '',
      deleteLoading: false,
      deleteMsg: '',
      showUserId: false,
    },
  );

  // 使用 ref 保持最新 state 供稳定 handler 读取
  const formRef = useRef<FormState>(form);
  const userRef = useRef<typeof user>(user);
  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { userRef.current = user; }, [user]);

  /* --------------------------- 副作用：剩余备份码 ------------------------- */
  useEffect(() => {
    if (user?.totp_enabled) {
      getRemainingBackupCodes()
        .then((r) => setForm({ backupCount: r.data.count }))
        .catch(() => {});
    }
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
        popupCheckInterval.current = null;
      }
    };
  }, [user?.totp_enabled]);

  /* --------------------------- popup 监控 -------------------------------- */
  const monitorPopup = useCallback(
    (popup: Window | null) => {
      if (!popup) return;
      if (popupCheckInterval.current) clearInterval(popupCheckInterval.current);
      popupCheckInterval.current = setInterval(() => {
        if (!popup || popup.closed) {
          if (popupCheckInterval.current) {
            clearInterval(popupCheckInterval.current);
            popupCheckInterval.current = null;
          }
          checkAuth();
        }
      }, 1000);
    },
    [checkAuth],
  );

  /* --------------------------- 预加载 admin 组件 -------------------------- */
  const preloadAdminChunks = useCallback(() => {
    if (!isAdmin) return;
    void import('./components/UserManagement');
    void import('./components/OAuthManagement');
  }, [isAdmin]);

  /* --------------------------- handlers --------------------------------- */

  // 删除账户
  const handleDeleteAccount = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ deleteLoading: true, deleteMsg: '' });
    try {
      const u = userRef.current;
      const f = formRef.current;
      await deleteAccount({
        password: u?.has_password ? f.deletePwd : undefined,
        code: u?.totp_enabled ? f.deleteCode : undefined,
      });
      closeModal('delete');
      alert('账号已成功删除。');
      logout();
    } catch (err) {
      setForm({ deleteMsg: getErrMsg(err, '删除失败，请重试') });
    } finally {
      setForm({ deleteLoading: false });
    }
  }, [closeModal, logout]);

  // 修改/设置密码
  const handlePwdSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const u = userRef.current;
    if (!u) return;
    setForm({ pwdLoading: true, pwdMsg: '' });
    try {
      const f = formRef.current;
      await updatePassword(
        u.has_password ? { oldPassword: f.oldPwd, newPassword: f.newPwd } : { newPassword: f.newPwd },
      );
      setForm({ pwdMsg: '密码设置成功！' });
      setTimeout(() => {
        closeModal('pwd');
        setForm({ oldPwd: '', newPwd: '', pwdMsg: '' });
      }, 1200);
    } catch (err) {
      setForm({ pwdMsg: getErrMsg(err, '设置失败') });
    } finally {
      setForm({ pwdLoading: false });
    }
  }, [closeModal]);

  // 启用 2FA 第一步：输入密码
  const handleSetup2faPwd = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ setup2faPwdMsg: '' });
    try {
      const f = formRef.current;
      const res = await setup2FA(f.setup2faPwd);
      setForm({
        qr: res.data.qr,
        secret: res.data.secret,
        backupCodes: res.data.backupCodes,
      });
      closeModal('setup2faPwd');
      openModal('totp');
      setForm({ setup2faPwd: '' });
    } catch (err) {
      setForm({ setup2faPwdMsg: getErrMsg(err, '密码验证失败') });
    }
  }, [closeModal, openModal]);

  // 启用 2FA 第二步：输入验证码
  const handleVerify2FA = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ totpLoading: true, totpMsg: '' });
    try {
      const f = formRef.current;
      await verify2FA({ email: user?.email || '', totp: f.totpToken });
      setForm({ totpMsg: '2FA 启用成功！正在刷新...' });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setForm({ totpMsg: getErrMsg(err, '验证码错误') });
    } finally {
      setForm({ totpLoading: false });
    }
  }, [user?.email]);

  // 生成新备份码 – 打开密码验证
  const handleGenBackupCodes = useCallback(() => {
    openModal('genBackupPwd');
  }, [openModal]);

  const handleGenBackupPwdSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ genBackupPwdMsg: '' });
    try {
      const f = formRef.current;
      const res = await generateBackupCodes(f.genBackupPwd);
      setForm({
        backupCodes: res.data.codes,
        backupMsg: '新备份码已生成，请妥善保存！',
        backupCount: res.data.codes.length,
        genBackupPwd: '',
      });
      closeModal('genBackupPwd');
      openModal('backupCodes');
    } catch (err) {
      setForm({ genBackupPwdMsg: getErrMsg(err, '密码验证失败') });
    }
  }, [closeModal, openModal]);

  // 关闭 2FA
  const handleDisable2FA = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ disable2faLoading: true, disable2faMsg: '' });
    try {
      const f = formRef.current;
      await disable2FA({
        token: f.totpToken || undefined,
        backupCode: f.disableBackupCode || undefined,
      });
      setForm({ disable2faMsg: '2FA已关闭，正在刷新...' });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setForm({ disable2faMsg: getErrMsg(err, '关闭失败') });
    } finally {
      setForm({ disable2faLoading: false });
    }
  }, []);

  // 用户名
  const handleUsernameSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ usernameLoading: true, usernameMsg: '' });
    try {
      const f = formRef.current;
      await updateUsername(f.newUsername);
      setForm({ usernameMsg: '用户名设置成功！' });
      await checkAuth();
      setTimeout(() => {
        closeModal('username');
        setForm({ usernameMsg: '' });
      }, 1200);
    } catch (err) {
      setForm({ usernameMsg: getErrMsg(err, '设置失败') });
    } finally {
      setForm({ usernameLoading: false });
    }
  }, [checkAuth, closeModal]);

  // 更换邮箱
  const handleEmailSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ emailLoading: true, emailMsg: '' });
    try {
      const f = formRef.current;
      const r = await updateEmail({ newEmail: f.newEmail, password: f.emailPwd });
      setForm({ emailMsg: r.data.message || '验证邮件已发送至新邮箱，请查收。' });
      await checkAuth();
      setTimeout(() => {
        closeModal('email');
        setForm({ newEmail: '', emailPwd: '', emailMsg: '' });
      }, 1500);
    } catch (err) {
      setForm({ emailMsg: getErrMsg(err, '更换失败') });
    } finally {
      setForm({ emailLoading: false });
    }
  }, [checkAuth, closeModal]);

  // OAuth 绑定
  const handleBindGithub = useCallback(
    () => monitorPopup(window.open('/api/github', 'github_oauth', 'width=1000,height=700')),
    [monitorPopup],
  );
  const handleBindGoogle = useCallback(
    () => monitorPopup(window.open('/api/google', 'google_oauth', 'width=1000,height=700')),
    [monitorPopup],
  );

  /* --------------------------- render helpers ---------------------------- */
  const renderEmailStatus = useCallback(
    () => (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${user?.verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {user?.verified ? '已验证' : '未验证'}
      </span>
    ),
    [user?.verified],
  );

  /* --------------------------- Tab 内容 ---------------------------------- */
  const renderContent = useMemo(() => {
    if (!user) return <LoadingIndicator />;

    switch (activeTab) {
      case 'general':
        return (
          <div className="flex flex-col gap-6">
            <GeneralSection
              user={user}
              showUserId={form.showUserId}
              toggleShowUserId={() => setForm({ showUserId: !form.showUserId })}
              openUsernameModal={() => openModal('username')}
              openEmailModal={() => openModal('email')}
              openPwdModal={() => openModal('pwd')}
              renderEmailStatus={renderEmailStatus}
            />
          </div>
        );

      case 'security':
        return (
          <div className="flex flex-col gap-6">
            <SecuritySection
              user={user}
              backupCount={form.backupCount}
              backupMsg={form.backupMsg}
              handleGenBackupCodes={handleGenBackupCodes}
              handleSetup2FA={() => openModal('setup2faPwd')}
              openDisable2faModal={() => openModal('disable2fa')}
            />
          </div>
        );

      case 'connections':
        return (
          <div className="flex flex-col gap-6">
            <ConnectionsSection
              user={user}
              handleBindGithub={handleBindGithub}
              handleBindGoogle={handleBindGoogle}
            />
          </div>
        );

      case 'oauth':
        return (
          <div className="rounded-xl bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <KeySquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-base font-medium text-foreground">OAuth 应用</p>
                <p className="mt-1 text-sm text-muted-foreground">管理 OAuth2/OIDC 应用与凭证</p>
              </div>
            </div>
            <OAuthManagement />
          </div>
        );

      case 'admin':
        return (
          <div className="rounded-xl bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-base font-medium text-foreground">用户管理</p>
                <p className="mt-1 text-sm text-muted-foreground">系统用户与权限管理</p>
              </div>
            </div>
            <UserManagement />
          </div>
        );

      case 'danger':
        return (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl bg-card pl-5 pr-4 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-base font-medium text-foreground">删除账户</p>
                    <p className="mt-1 text-sm leading-tight text-muted-foreground">
                      删除后，所有数据将被永久清除且无法恢复。
                    </p>
                  </div>
                </div>
                <div className="flex-none shrink-0">
                  <Button
                    variant="error"
                    onClick={() => openModal('delete')}
                    className="px-4 py-2 text-sm"
                  >
                    删除我的账户
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [
    user,
    activeTab,
    form.showUserId,
    form.backupCount,
    form.backupMsg,
    renderEmailStatus,
    handleGenBackupCodes,
    handleBindGithub,
    handleBindGoogle,
    openModal,
  ]);

  /* --------------------------- 页面渲染 ---------------------------------- */
  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <Header user={user} />

      {/* Page Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-8 pt-10 pb-14">
        {/* 面包屑 + 标题 */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/dashboard" className="hover:text-foreground transition-colors">用户中心</a>
            <ChevronRight className="h-3 w-3" />
            <span>设置</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{currentTab?.title || '设置'}</h1>
            <p className="mt-1 text-base text-muted-foreground">{currentTab?.description || '管理账户与安全'}</p>
          </div>
        </div>

        {/* 主体：左侧导航 + 右侧内容 */}
        <div className="flex gap-8">
          {/* 左侧导航 */}
          <aside className="w-64 flex-shrink-0">
            <nav className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <h3 className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">设置</h3>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const cls = isActive
                    ? (tab.danger ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-foreground bg-muted')
                    : (tab.danger
                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50');
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      onMouseEnter={preloadAdminChunks}
                      onFocus={preloadAdminChunks}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${cls}`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* 右侧内容 */}
          <section className="min-w-0 flex-1">
            {renderContent}
          </section>
        </div>
      </main>

      <Footer />

      {/* --------------------------- ConfirmModal（按需挂载） ---------------- */}
      {/* 密码 */}
      {modalOpen.pwd && (
        <ConfirmModal
          isOpen={modalOpen.pwd}
          onClose={() => closeModal('pwd')}
          onConfirm={handlePwdSubmit}
          title={user?.has_password ? '修改密码' : '设置密码'}
          message={
            <form className="space-y-4" onSubmit={handlePwdSubmit}>
              {user?.has_password && (
                <div>
                  <label className="mb-1 block text-sm font-medium">旧密码</label>
                  <Input type="password" value={form.oldPwd} onChange={(e) => setForm({ oldPwd: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">新密码</label>
                <Input type="password" value={form.newPwd} onChange={(e) => setForm({ newPwd: e.target.value })} required />
              </div>
              {form.pwdMsg && (
                <div
                  className={`text-sm ${form.pwdMsg.includes('成功') ? 'text-emerald-600' : 'text-red-600'}`}
                  aria-live="polite"
                >
                  {form.pwdMsg}
                </div>
              )}
            </form>
          }
          type="default"
          confirmText={form.pwdLoading ? '提交中...' : '提交'}
          cancelText="取消"
          isLoading={form.pwdLoading}
        />
      )}

      {/* 启用 2FA — 输入密码 */}
      {modalOpen.setup2faPwd && (
        <ConfirmModal
          isOpen={modalOpen.setup2faPwd}
          onClose={() => closeModal('setup2faPwd')}
          onConfirm={handleSetup2faPwd}
          title="验证密码以启用 2FA"
          message={
            <form className="space-y-4" onSubmit={handleSetup2faPwd}>
              <div>
                <label className="mb-1 block text-sm font-medium">当前密码</label>
                <Input
                  type="password"
                  value={form.setup2faPwd}
                  onChange={(e) => setForm({ setup2faPwd: e.target.value })}
                  required
                  placeholder="请输入当前密码"
                />
              </div>
              {form.setup2faPwdMsg && <div className="text-sm text-red-600" aria-live="polite">{form.setup2faPwdMsg}</div>}
            </form>
          }
          type="default"
          confirmText="验证"
          cancelText="取消"
        />
      )}

      {/* 启用 2FA — 扫码 & 输入验证码 */}
      {modalOpen.totp && (
        <ConfirmModal
          isOpen={modalOpen.totp}
          onClose={() => closeModal('totp')}
          onConfirm={handleVerify2FA}
          title="启用二步验证"
          message={
            <form className="space-y-4" onSubmit={handleVerify2FA}>
              <p className="text-sm text-muted-foreground">请使用 Authenticator 扫描二维码或手动输入密钥。</p>
              {form.qr && (
                <Image
                  src={form.qr}
                  alt="QR Code"
                  width={160}
                  height={160}
                  className="mx-auto block rounded border border-border p-1"
                />
              )}
              <div className="text-center">
                <label className="block text-xs font-medium text-muted-foreground">密钥</label>
                <span className="select-all font-mono text-sm">{form.secret}</span>
              </div>
              <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950/40">
                <p className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300">重要提示：请妥善保存以下备份码！</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {form.backupCodes.map((c: string) => (
                    <span key={c} className="select-all rounded px-2 py-0.5 font-mono text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">输入 6 位验证码</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.totpToken}
                  onChange={(e) => setForm({ totpToken: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                  pattern="\d{6}"
                  placeholder="123456"
                />
              </div>
              {form.totpMsg && (
                <div
                  className={`text-sm ${form.totpMsg.includes('成功') ? 'text-emerald-600' : 'text-red-600'}`}
                  aria-live="polite"
                >
                  {form.totpMsg}
                </div>
              )}
            </form>
          }
          type="default"
          confirmText={form.totpLoading ? '验证中...' : '完成启用'}
          cancelText="取消"
          isLoading={form.totpLoading}
        />
      )}

      {/* 新备份码展示 */}
      {modalOpen.backupCodes && (
        <ConfirmModal
          isOpen={modalOpen.backupCodes}
          onClose={() => closeModal('backupCodes')}
          onConfirm={() => closeModal('backupCodes')}
          title="新备份码"
          message={
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">已生成新的备份码，请妥善保存。</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border p-3">
                {form.backupCodes.map((c: string) => (
                  <span key={c} className="select-all rounded bg-muted/50 px-2 py-0.5 font-mono text-sm">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          }
          type="default"
          confirmText="我知道了"
          cancelText="关闭"
        />
      )}

      {/* 关闭 2FA */}
      {modalOpen.disable2fa && (
        <ConfirmModal
          isOpen={modalOpen.disable2fa}
          onClose={() => closeModal('disable2fa')}
          onConfirm={handleDisable2FA}
          title="关闭二步验证"
          message={
            <form className="space-y-4" onSubmit={handleDisable2FA}>
              <p className="text-sm text-muted-foreground">输入 6 位验证码或一个备份码以关闭 2FA。</p>
              <div>
                <label className="mb-1 block text-sm font-medium">验证码 / 备份码</label>
                <Input
                  type="text"
                  value={form.totpToken || form.disableBackupCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    const onlyDigits = v.replace(/\D/g, '').slice(0, 6);
                    if (onlyDigits === v) {
                      setForm({ totpToken: onlyDigits, disableBackupCode: '' });
                    } else {
                      setForm({ disableBackupCode: v, totpToken: '' });
                    }
                  }}
                  placeholder="6 位验证码或备份码"
                  required
                />
              </div>
              {form.disable2faMsg && (
                <div
                  className={`text-sm ${
                    form.disable2faMsg.includes('成功') || form.disable2faMsg.includes('刷新')
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                  aria-live="polite"
                >
                  {form.disable2faMsg}
                </div>
              )}
            </form>
          }
          type="danger"
          confirmText={form.disable2faLoading ? '提交中...' : '确认关闭'}
          cancelText="取消"
          isLoading={form.disable2faLoading}
        />
      )}

      {/* 修改用户名 */}
      {modalOpen.username && (
        <ConfirmModal
          isOpen={modalOpen.username}
          onClose={() => closeModal('username')}
          onConfirm={handleUsernameSubmit}
          title={user?.username ? '修改用户名' : '设置用户名'}
          message={
            <form className="space-y-4" onSubmit={handleUsernameSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium">用户名</label>
                <Input
                  type="text"
                  value={form.newUsername}
                  onChange={(e) => setForm({ newUsername: e.target.value })}
                  required
                  placeholder="请输入新用户名"
                />
                <div className="mt-1 text-xs text-muted-foreground">可包含字母、数字、下划线和连字符</div>
              </div>
              {form.usernameMsg && (
                <div
                  className={`text-sm ${form.usernameMsg.includes('成功') ? 'text-emerald-600' : 'text-red-600'}`}
                  aria-live="polite"
                >
                  {form.usernameMsg}
                </div>
              )}
            </form>
          }
          type="default"
          confirmText={form.usernameLoading ? '提交中...' : '提交'}
          cancelText="取消"
          isLoading={form.usernameLoading}
        />
      )}

      {/* 生成新备份码前密码验证 */}
      {modalOpen.genBackupPwd && (
        <ConfirmModal
          isOpen={modalOpen.genBackupPwd}
          onClose={() => closeModal('genBackupPwd')}
          onConfirm={handleGenBackupPwdSubmit}
          title="验证密码以生成新备份码"
          message={
            <form className="space-y-4" onSubmit={handleGenBackupPwdSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium">当前密码</label>
                <Input
                  type="password"
                  value={form.genBackupPwd}
                  onChange={(e) => setForm({ genBackupPwd: e.target.value })}
                  required
                  placeholder="请输入当前密码"
                />
              </div>
              {form.genBackupPwdMsg && <div className="text-sm text-red-600" aria-live="polite">{form.genBackupPwdMsg}</div>}
            </form>
          }
          type="default"
          confirmText="验证"
          cancelText="取消"
        />
      )}

      {/* 更换邮箱 */}
      {modalOpen.email && (
        <ConfirmModal
          isOpen={modalOpen.email}
          onClose={() => closeModal('email')}
          onConfirm={handleEmailSubmit}
          title="更换邮箱"
          message={
            <form className="space-y-4" onSubmit={handleEmailSubmit}>
              <p className="text-sm text-muted-foreground">更换邮箱后需通过新邮箱验证。</p>
              <div>
                <label className="mb-1 block text-sm font-medium">新邮箱地址</label>
                <Input
                  type="email"
                  value={form.newEmail}
                  onChange={(e) => setForm({ newEmail: e.target.value })}
                  required
                  placeholder="请输入新邮箱"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">当前密码</label>
                <Input
                  type="password"
                  value={form.emailPwd}
                  onChange={(e) => setForm({ emailPwd: e.target.value })}
                  required
                  placeholder="请输入当前密码"
                />
              </div>
              {form.emailMsg && (
                <div
                  className={`text-sm ${
                    form.emailMsg.includes('失败') ? 'text-red-600' : 'text-emerald-600'
                  }`}
                  aria-live="polite"
                >
                  {form.emailMsg}
                </div>
              )}
            </form>
          }
          type="default"
          confirmText={form.emailLoading ? '提交中...' : '提交'}
          cancelText="取消"
          isLoading={form.emailLoading}
        />
      )}

      {/* 删除账户 */}
      {modalOpen.delete && (
        <ConfirmModal
          isOpen={modalOpen.delete}
          onClose={() => closeModal('delete')}
          onConfirm={handleDeleteAccount}
          title="确认删除账户"
          message={
            <form className="space-y-4" onSubmit={handleDeleteAccount}>
              <p className="text-sm text-red-600">此操作无法撤销！请输入您的凭据以确认删除。</p>
              {user?.has_password && (
                <div>
                  <label className="mb-1 block text-sm font-medium">当前密码</label>
                  <Input
                    type="password"
                    value={form.deletePwd}
                    onChange={(e) => setForm({ deletePwd: e.target.value })}
                    required
                    placeholder="请输入当前密码"
                    autoFocus
                  />
                </div>
              )}
              {user?.totp_enabled && (
                <div>
                  <label className="mb-1 block text-sm font-medium">2FA 验证码 / 备份码</label>
                  <Input
                    type="text"
                    value={form.deleteCode}
                    onChange={(e) => setForm({ deleteCode: e.target.value })}
                    required
                    placeholder="6 位验证码或备份码"
                  />
                </div>
              )}
              {form.deleteMsg && <div className="text-sm text-red-600" aria-live="polite">{form.deleteMsg}</div>}
            </form>
          }
          type="danger"
          confirmText={form.deleteLoading ? '删除中...' : '确认删除'}
          cancelText="取消"
          isLoading={form.deleteLoading}
        />
      )}
    </div>
  );
}