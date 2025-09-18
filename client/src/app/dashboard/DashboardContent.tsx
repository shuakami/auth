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

import Header from './components/Header';
import Footer from './components/Footer';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
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

import { NavItem, Input } from './DashboardUI';
import {
  GeneralSection,
  SecuritySection,
  ConnectionsSection,
} from './DashboardSections';
import LocalLoadingSpinner from './components/LocalLoadingSpinner';

// 动态导入管理组件（按需加载）
const UserManagement = dynamic(() => import('./components/UserManagement'), {
  ssr: false,
  loading: () => <LocalLoadingSpinner />,
});
const OAuthManagement = dynamic(() => import('./components/OAuthManagement'), {
  ssr: false,
  loading: () => <LocalLoadingSpinner />,
});

// 动态导入 ConfirmModal（按需挂载）
const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), {
  ssr: false,
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

type SectionKey = 'general' | 'security' | 'connections' | 'admin' | 'oauth';

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

  // 更稳健的定时器引用类型（兼容浏览器/Node）
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* --------------------------- 视口 / 分区切换 ---------------------------- */
  const [activeSection, setActiveSection] = useReducer(
    (_: SectionKey, next: SectionKey) => next,
    (typeof window !== 'undefined'
      ? ((localStorage.getItem('dashboard-active-section') as SectionKey | null) ??
        'general')
      : 'general') as SectionKey,
  );

  // 将 activeSection 写入 localStorage，但放到空闲时段
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const write = () => localStorage.setItem('dashboard-active-section', activeSection);
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(write);
      return () => typeof w.cancelIdleCallback === 'function' && w.cancelIdleCallback(id);
    } else {
      const id = setTimeout(write, 0);
      return () => clearTimeout(id);
    }
  }, [activeSection]);

  /* --------------------------- 管理员权限检查 ---------------------------- */
  const [isAdmin, setIsAdmin] = useReducer((_: boolean, next: boolean) => next, false);
  useEffect(() => {
    checkAdminPermission()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [user]);

  // 移动端检测
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

  // 使用 ref 保持最新的状态供稳定 handler 读取
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

  /* --------------------------- 管理模块预取 ------------------------------- */
  const preloadAdminChunks = useCallback(() => {
    if (!isAdmin) return;
    // 仅预热，不改变现有逻辑
    void import('./components/UserManagement');
    void import('./components/OAuthManagement');
  }, [isAdmin]);

  /* --------------------------- 所有 handler（稳定引用） ------------------- */

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
  }, []);

  // 生成新备份码（打开密码验证弹窗）
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
      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-xs font-medium text-neutral-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            user?.verified ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        {user?.verified ? '已验证' : '未验证'}
      </span>
    ),
    [user?.verified],
  );

  /* --------------------------- 主内容映射 -------------------------------- */
  const mainContent = useMemo(() => {
    if (!user) return <LoadingIndicator />;

    const general = (
      <GeneralSection
        user={user}
        showUserId={form.showUserId}
        toggleShowUserId={() => setForm({ showUserId: !form.showUserId })}
        openUsernameModal={() => openModal('username')}
        openEmailModal={() => openModal('email')}
        openPwdModal={() => openModal('pwd')}
        renderEmailStatus={renderEmailStatus}
      />
    );

    const security = (
      <div className="space-y-12">
        <SecuritySection
          user={user}
          backupCount={form.backupCount}
          backupMsg={form.backupMsg}
          handleGenBackupCodes={handleGenBackupCodes}
          handleSetup2FA={() => openModal('setup2faPwd')}
          openDisable2faModal={() => openModal('disable2fa')}
          handleDeleteAccountClick={() => openModal('delete')}
        />
      </div>
    );

    const connections = (
      <ConnectionsSection
        user={user}
        handleBindGithub={handleBindGithub}
        handleBindGoogle={handleBindGoogle}
      />
    );

    const admin = isAdmin ? <UserManagement /> : null;
    const oauth = isAdmin ? <OAuthManagement /> : null;

    switch (activeSection) {
      case 'general':
        return general;
      case 'security':
        return security;
      case 'connections':
        return connections;
      case 'admin':
        return admin;
      case 'oauth':
        return oauth;
      default:
        return general;
    }
  }, [
    user,
    isAdmin,
    activeSection,
    form.showUserId,
    form.backupCount,
    form.backupMsg,
    renderEmailStatus,
    handleBindGithub,
    handleBindGoogle,
    handleGenBackupCodes,
    openModal,
  ]);

  /* --------------------------- 右侧信息侧栏 ------------------------------- */
  const RightRail = useMemo(() => {
    return (
      <aside className="sticky top-24 space-y-10">
        {/* 快捷操作 */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-widest text-neutral-500 dark:text-zinc-400">
            快捷操作
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openModal('pwd')}
              className="rounded-full border border-black/10 bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/[0.06]"
            >
              修改密码
            </button>
            <button
              onClick={() => openModal('email')}
              className="rounded-full border border-black/10 bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/[0.06]"
            >
              更换邮箱
            </button>
            {!user?.totp_enabled ? (
              <button
                onClick={() => openModal('setup2faPwd')}
                className="rounded-full border border-black/10 bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/[0.06]"
              >
                启用 2FA
              </button>
            ) : (
              <>
                <button
                  onClick={() => openModal('genBackupPwd')}
                  className="rounded-full border border-black/10 bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                >
                  生成备份码
                </button>
                <button
                  onClick={() => openModal('disable2fa')}
                  className="rounded-full border border-black/10 bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/[0.06]"
                >
                  关闭 2FA
                </button>
              </>
            )}
            <button
              onClick={() => openModal('delete')}
              className="rounded-full border border-red-200/60 bg-transparent px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 active:bg-red-100 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              删除账户
            </button>
          </div>
        </section>

        {/* 轻提示 */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-widest text-neutral-500 dark:text-zinc-400">
            提示
          </h3>
          <p className="text-xs leading-5 text-neutral-500 dark:text-zinc-400">
            所有操作均即时生效且无需刷新；涉及安全项时会以弹窗二次确认。
          </p>
        </section>
      </aside>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.verified, user?.totp_enabled, form.backupCount, isAdmin]);

  /* --------------------------- 页面渲染 ---------------------------------- */
  return (
    <div
      className="flex min-h-screen flex-col bg-white text-neutral-900 selection:bg-black/80 selection:text-white dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-white/80 dark:selection:text-black
      bg-[radial-gradient(1000px_400px_at_50%_-120px,rgba(0,0,0,0.05),transparent)] dark:bg-[radial-gradient(1000px_400px_at_50%_-120px,rgba(255,255,255,0.06),transparent)]"
    >
      <Header user={user} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-8">
        <header className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-zinc-100">
            用户中心
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-zinc-400">
            管理你的账户、安全与绑定。桌面端采用编辑型排版，无“卡片套娃”。
          </p>
        </header>

        {/* 移动端横向分段导航（PC 隐藏） */}
        <nav className="sticky top-16 z-20 -mx-6 mb-6 border-b border-black/5 bg-white/80 px-6 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70 lg:hidden">
          <div className="flex gap-2 overflow-x-auto py-2">
            {[
              { key: 'general', label: '通用设置' },
              { key: 'security', label: '安全设置' },
              { key: 'connections', label: '账号绑定' },
              ...(isAdmin ? [{ key: 'admin', label: '用户管理' }] : []),
              ...(isAdmin ? [{ key: 'oauth', label: 'OAuth应用' }] : []),
            ].map((it) => (
              <button
                key={it.key}
                onClick={() => setActiveSection(it.key as SectionKey)}
                onMouseEnter={preloadAdminChunks}
                onFocus={preloadAdminChunks}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                  activeSection === it.key
                    ? 'bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-black/[0.04] text-neutral-700 hover:bg-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1]'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 桌面 Editorial 12 栏布局：2 / 7 / 3 */}
        <div className="grid grid-cols-12 gap-8">
          {/* 左侧：文字侧边导航（无卡面） */}
          <nav className="relative col-span-2 hidden lg:block">
            <div className="sticky top-24">
              <div className="space-y-1">
                <NavItem
                  active={activeSection === 'general'}
                  onClick={() => setActiveSection('general')}
                >
                  通用设置
                </NavItem>
                <NavItem
                  active={activeSection === 'security'}
                  onClick={() => setActiveSection('security')}
                >
                  安全设置
                </NavItem>
                <NavItem
                  active={activeSection === 'connections'}
                  onClick={() => setActiveSection('connections')}
                >
                  账号绑定
                </NavItem>

                {isAdmin && (
                  <div className="mt-4 pt-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-zinc-500 border-t border-black/5 dark:border-white/10">
                    管理
                  </div>
                )}

                {isAdmin && (
                  <NavItem
                    active={activeSection === 'admin'}
                    onClick={() => setActiveSection('admin')}
                    onMouseEnter={preloadAdminChunks}
                    onFocus={preloadAdminChunks}
                  >
                    用户管理
                  </NavItem>
                )}
                {isAdmin && (
                  <NavItem
                    active={activeSection === 'oauth'}
                    onClick={() => setActiveSection('oauth')}
                    onMouseEnter={preloadAdminChunks}
                    onFocus={preloadAdminChunks}
                  >
                    OAuth 应用
                  </NavItem>
                )}
              </div>
            </div>
          </nav>

          {/* 中间：主内容（无卡面；自然留白 + divide-y） */}
          <section className="col-span-12 lg:col-span-7">
            <div className="space-y-12 divide-y divide-black/5 dark:divide-white/10 [&>section]:pt-8 first:[&>section]:pt-0">
              {mainContent}
            </div>
          </section>

          {/* 右侧：信息侧栏（无卡面） */}
          <aside className="col-span-3 hidden xl:block">
            {RightRail}
          </aside>
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
                  <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">旧密码</label>
                  <Input type="password" value={form.oldPwd} onChange={(e) => setForm({ oldPwd: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">新密码</label>
                <Input type="password" value={form.newPwd} onChange={(e) => setForm({ newPwd: e.target.value })} required />
              </div>
              {form.pwdMsg && (
                <div
                  className={`text-sm ${form.pwdMsg.includes('成功') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
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
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">当前密码</label>
                <Input
                  type="password"
                  value={form.setup2faPwd}
                  onChange={(e) => setForm({ setup2faPwd: e.target.value })}
                  required
                  placeholder="请输入当前密码"
                />
              </div>
              {form.setup2faPwdMsg && <div className="text-sm text-red-600 dark:text-red-400" aria-live="polite">{form.setup2faPwdMsg}</div>}
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
              <p className="text-sm text-neutral-600 dark:text-zinc-400">请使用 Authenticator 扫描二维码或手动输入密钥。</p>
              {form.qr && (
                <Image
                  src={form.qr}
                  alt="QR Code"
                  width={160}
                  height={160}
                  className="mx-auto block rounded border border-black/10 p-1 dark:border-white/10"
                />
              )}
              <div className="text-center">
                <label className="block text-xs font-medium text-neutral-500 dark:text-zinc-500">密钥</label>
                <span className="select-all font-mono text-sm text-neutral-800 dark:text-zinc-200">{form.secret}</span>
              </div>
              <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">重要提示：请妥善保存以下备份码！</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {form.backupCodes.map((c: string) => (
                    <span key={c} className="select-all rounded px-2 py-0.5 font-mono text-xs text-neutral-700 dark:text-zinc-200">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">输入 6 位验证码</label>
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
                  className={`text-sm ${form.totpMsg.includes('成功') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
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
              <p className="text-sm text-neutral-600 dark:text-zinc-400">已生成新的备份码，请妥善保存。</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-black/10 p-3 dark:border-white/10">
                {form.backupCodes.map((c: string) => (
                  <span key={c} className="select-all rounded bg-black/[0.04] px-2 py-0.5 font-mono text-sm text-neutral-700 dark:bg-white/[0.06] dark:text-zinc-200">
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
              <p className="text-sm text-neutral-600 dark:text-zinc-400">输入 6 位验证码或一个备份码以关闭 2FA。</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">验证码 / 备份码</label>
                <Input
                  type="text"
                  value={form.totpToken || form.disableBackupCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    // 数字视为 TOTP，其余视为备份码
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
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
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
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">用户名</label>
                <Input
                  type="text"
                  value={form.newUsername}
                  onChange={(e) => setForm({ newUsername: e.target.value })}
                  required
                  placeholder="请输入新用户名"
                />
                <div className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">可包含字母、数字、下划线和连字符</div>
              </div>
              {form.usernameMsg && (
                <div
                  className={`text-sm ${form.usernameMsg.includes('成功') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
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
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">当前密码</label>
                <Input
                  type="password"
                  value={form.genBackupPwd}
                  onChange={(e) => setForm({ genBackupPwd: e.target.value })}
                  required
                  placeholder="请输入当前密码"
                />
              </div>
              {form.genBackupPwdMsg && <div className="text-sm text-red-600 dark:text-red-400" aria-live="polite">{form.genBackupPwdMsg}</div>}
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
              <p className="text-sm text-neutral-600 dark:text-zinc-400">更换邮箱后需通过新邮箱验证。</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">新邮箱地址</label>
                <Input
                  type="email"
                  value={form.newEmail}
                  onChange={(e) => setForm({ newEmail: e.target.value })}
                  required
                  placeholder="请输入新邮箱"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">当前密码</label>
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
                    form.emailMsg.includes('失败') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
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
              <p className="text-sm text-red-600 dark:text-red-400">此操作无法撤销！请输入您的凭据以确认删除。</p>
              {user?.has_password && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">当前密码</label>
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
                  <label className="mb-1 block text-sm font-medium text-neutral-800 dark:text-zinc-200">2FA 验证码 / 备份码</label>
                  <Input
                    type="text"
                    value={form.deleteCode}
                    onChange={(e) => setForm({ deleteCode: e.target.value })}
                    required
                    placeholder="6 位验证码或备份码"
                  />
                </div>
              )}
              {form.deleteMsg && <div className="text-sm text-red-600 dark:text-red-400" aria-live="polite">{form.deleteMsg}</div>}
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
