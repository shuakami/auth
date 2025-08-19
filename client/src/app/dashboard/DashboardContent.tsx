'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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

// 动态导入管理组件
const UserManagement = dynamic(() => import('./components/UserManagement'), { 
  ssr: false,
  loading: () => <LoadingIndicator />
});

// 动态导入OAuth管理组件
const OAuthManagement = dynamic(() => import('./components/OAuthManagement'), { 
  ssr: false,
  loading: () => <LoadingIndicator />
});

const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), { ssr: false });

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
  const popupCheckInterval = useRef<NodeJS.Timeout | null>(null);

  /* --------------------------- 视口 / 分区切换 ---------------------------- */
  const [activeSection, setActiveSection] = useReducer(
    (_: 'general' | 'security' | 'connections' | 'admin' | 'oauth', next: 'general' | 'security' | 'connections' | 'admin' | 'oauth') => next,
    // 从localStorage恢复上次的选择，默认为'general'
    (typeof window !== 'undefined' ? localStorage.getItem('dashboard-active-section') as any : null) || 'general',
  );

  // 保存activeSection到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-active-section', activeSection);
    }
  }, [activeSection]);
  
  /* --------------------------- 管理员权限检查 ---------------------------- */
  const [isAdmin, setIsAdmin] = useReducer((_: boolean, next: boolean) => next, false);
  useEffect(() => {
    checkAdminPermission()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [user]);
  const [isMobile, setIsMobile] = useReducer(() => window.matchMedia('(max-width: 1023px)').matches, false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile();
    const l = () => setIsMobile();
    mql.addEventListener('change', l);
    return () => mql.removeEventListener('change', l);
  }, []);

  /* --------------------------- 全局 form state --------------------------- */
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

  const openModal = (key: ModalKey) => setModalOpen({ type: 'open', key });
  const closeModal = (key: ModalKey) => setModalOpen({ type: 'close', key });

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
      popupCheckInterval.current && clearInterval(popupCheckInterval.current);
      popupCheckInterval.current = setInterval(() => {
        if (!popup || popup.closed) {
          popupCheckInterval.current && clearInterval(popupCheckInterval.current);
          popupCheckInterval.current = null;
          checkAuth();
        }
      }, 1000);
    },
    [checkAuth],
  );

  /* --------------------------- 所有 handler ------------------------------ */

  /* 删除账户 */
  const handleDeleteAccount = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ deleteLoading: true, deleteMsg: '' });
    try {
      await deleteAccount({
        password: user?.has_password ? form.deletePwd : undefined,
        code: user?.totp_enabled ? form.deleteCode : undefined,
      });
      closeModal('delete');
      alert('账号已成功删除。');
      logout();
    } catch (err) {
      setForm({ deleteMsg: getErrMsg(err, '删除失败，请重试') });
    } finally {
      setForm({ deleteLoading: false });
    }
  };

  /* 密码 */
  const handlePwdSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    setForm({ pwdLoading: true, pwdMsg: '' });
    try {
      await updatePassword(
        user.has_password ? { oldPassword: form.oldPwd, newPassword: form.newPwd } : { newPassword: form.newPwd },
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
  };

  /* 启用 2FA 第一步：输入密码 */
  const handleSetup2faPwd = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ setup2faPwdMsg: '' });
    try {
      const res = await setup2FA(form.setup2faPwd);
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
  };

  /* 启用 2FA 第二步：输入验证码 */
  const handleVerify2FA = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ totpLoading: true, totpMsg: '' });
    try {
      await verify2FA({ token: form.totpToken });
      setForm({ totpMsg: '2FA 启用成功！正在刷新...' });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setForm({ totpMsg: getErrMsg(err, '验证码错误') });
    } finally {
      setForm({ totpLoading: false });
    }
  };

  /* 生成新备份码 */
  const handleGenBackupCodes = async () => {
    openModal('genBackupPwd');
  };
  const handleGenBackupPwdSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ genBackupPwdMsg: '' });
    try {
      const res = await generateBackupCodes(form.genBackupPwd);
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
  };

  /* 关闭 2FA */
  const handleDisable2FA = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ disable2faLoading: true, disable2faMsg: '' });
    try {
      await disable2FA({ token: form.totpToken || undefined, backupCode: form.disableBackupCode || undefined });
      setForm({ disable2faMsg: '2FA已关闭，正在刷新...' });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setForm({ disable2faMsg: getErrMsg(err, '关闭失败') });
    } finally {
      setForm({ disable2faLoading: false });
    }
  };

  /* 用户名 */
  const handleUsernameSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ usernameLoading: true, usernameMsg: '' });
    try {
      await updateUsername(form.newUsername);
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
  };

  /* 更换邮箱 */
  const handleEmailSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setForm({ emailLoading: true, emailMsg: '' });
    try {
      const r = await updateEmail({ newEmail: form.newEmail, password: form.emailPwd });
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
  };

  /* OAuth 绑定 */
  const handleBindGithub = () => monitorPopup(window.open('/api/github', 'github_oauth', 'width=1000,height=700'));
  const handleBindGoogle = () => monitorPopup(window.open('/api/google', 'google_oauth', 'width=1000,height=700'));

  /* --------------------------- render helpers ---------------------------- */
  const renderEmailStatus = useCallback(
    () =>
      user?.verified ? (
        <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
          已验证
        </span>
      ) : (
        <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
          未验证
        </span>
      ),
    [user?.verified],
  );

  /* --------------------------- mainContent ------------------------------- */
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

    if (isMobile) return <>{general}{security}{connections}{admin}{oauth}</>;

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
        return null;
    }
  }, [
    user,
    isMobile,
    activeSection,
    isAdmin,
    form.showUserId,
    form.backupCount,
    form.backupMsg,
    renderEmailStatus,
    handleBindGithub,
    handleBindGoogle,
    handleGenBackupCodes,
  ]);

  /* --------------------------- render 页面 ------------------------------- */
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-zinc-100">用户中心</h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-zinc-400">管理您的账户设置和偏好</p>
        </div>

        <div className="flex gap-8">
          <nav className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24 space-y-1">
              <NavItem active={activeSection === 'general'} onClick={() => setActiveSection('general')}>
                通用设置
              </NavItem>
              <NavItem active={activeSection === 'security'} onClick={() => setActiveSection('security')}>
                安全设置
              </NavItem>
              <NavItem active={activeSection === 'connections'} onClick={() => setActiveSection('connections')}>
                账号绑定
              </NavItem>
              {isAdmin && (
                <NavItem active={activeSection === 'admin'} onClick={() => setActiveSection('admin')}>
                  用户管理
                </NavItem>
              )}
              {isAdmin && (
                <NavItem active={activeSection === 'oauth'} onClick={() => setActiveSection('oauth')}>
                  OAuth应用
                </NavItem>
              )}
            </div>
          </nav>

          <section className="min-h-[36rem] flex-1">{mainContent}</section>
        </div>
      </main>

      <Footer />

      {/* --------------------------- ConfirmModal 列表 ----------------------- */}
      {/* 密码 */}
      <ConfirmModal
        isOpen={modalOpen.pwd}
        onClose={() => closeModal('pwd')}
        onConfirm={handlePwdSubmit}
        title={user?.has_password ? '修改密码' : '设置密码'}
        message={
          <form className="space-y-4" onSubmit={handlePwdSubmit}>
            {user?.has_password && (
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">旧密码</label>
                <Input type="password" value={form.oldPwd} onChange={(e) => setForm({ oldPwd: e.target.value })} required />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">新密码</label>
              <Input type="password" value={form.newPwd} onChange={(e) => setForm({ newPwd: e.target.value })} required />
            </div>
            {form.pwdMsg && (
              <div className={`text-sm ${form.pwdMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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

      {/* 启用 2FA — 输入密码 */}
      <ConfirmModal
        isOpen={modalOpen.setup2faPwd}
        onClose={() => closeModal('setup2faPwd')}
        onConfirm={handleSetup2faPwd}
        title="验证密码以启用 2FA"
        message={
          <form className="space-y-4" onSubmit={handleSetup2faPwd}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
              <Input
                type="password"
                value={form.setup2faPwd}
                onChange={(e) => setForm({ setup2faPwd: e.target.value })}
                required
                placeholder="请输入当前密码"
              />
            </div>
            {form.setup2faPwdMsg && <div className="text-sm text-red-600 dark:text-red-400">{form.setup2faPwdMsg}</div>}
          </form>
        }
        type="default"
        confirmText="验证"
        cancelText="取消"
      />

      {/* 启用 2FA — 扫码 & 输入验证码 */}
      <ConfirmModal
        isOpen={modalOpen.totp}
        onClose={() => closeModal('totp')}
        onConfirm={handleVerify2FA}
        title="启用二步验证"
        message={
          <form className="space-y-4" onSubmit={handleVerify2FA}>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">请使用 Authenticator 扫描二维码或手动输入密钥。</p>
            {form.qr && (
              <Image src={form.qr} alt="QR Code" width={160} height={160} className="mx-auto block rounded border border-neutral-300 p-1 dark:border-zinc-600" />
            )}
            <div className="text-center">
              <label className="block text-xs font-medium text-neutral-500 dark:text-zinc-500">密钥</label>
              <span className="select-all font-mono text-sm text-neutral-700 dark:text-zinc-300">{form.secret}</span>
            </div>
            <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <p className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300">重要提示：请妥善保存以下备份码！</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {form.backupCodes.map((c: string) => (
                  <span key={c} className="select-all rounded px-2 py-0.5 font-mono text-xs text-neutral-700 dark:text-zinc-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">输入 6 位验证码</label>
              <Input
                type="text"
                value={form.totpToken}
                onChange={(e) => setForm({ totpToken: e.target.value })}
                maxLength={6}
                required
                pattern="\d{6}"
                placeholder="123456"
              />
            </div>
            {form.totpMsg && (
              <div className={`text-sm ${form.totpMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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

      {/* 新备份码展示 */}
      <ConfirmModal
        isOpen={modalOpen.backupCodes}
        onClose={() => closeModal('backupCodes')}
        onConfirm={() => closeModal('backupCodes')}
        title="新备份码"
        message={
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-zinc-400">已生成新的备份码，请妥善保存。</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-neutral-200 p-3 dark:border-zinc-700">
              {form.backupCodes.map((c: string) => (
                <span key={c} className="select-all rounded bg-neutral-100 px-2 py-0.5 font-mono text-sm text-neutral-700 dark:bg-zinc-700 dark:text-zinc-200">
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

      {/* 关闭 2FA */}
      <ConfirmModal
        isOpen={modalOpen.disable2fa}
        onClose={() => closeModal('disable2fa')}
        onConfirm={handleDisable2FA}
        title="关闭二步验证"
        message={
          <form className="space-y-4" onSubmit={handleDisable2FA}>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">输入 6 位验证码或一个备份码以关闭 2FA。</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">验证码 / 备份码</label>
              <Input
                type="text"
                value={form.totpToken || form.disableBackupCode}
                onChange={(e) => {
                  const v = e.target.value;
                  /^\d{0,6}$/.test(v)
                    ? setForm({ totpToken: v, disableBackupCode: '' })
                    : setForm({ disableBackupCode: v, totpToken: '' });
                }}
                placeholder="6 位验证码或备份码"
                required
              />
            </div>
            {form.disable2faMsg && (
              <div className={`text-sm ${form.disable2faMsg.includes('成功') || form.disable2faMsg.includes('刷新') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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

      {/* 修改用户名 */}
      <ConfirmModal
        isOpen={modalOpen.username}
        onClose={() => closeModal('username')}
        onConfirm={handleUsernameSubmit}
        title={user?.username ? '修改用户名' : '设置用户名'}
        message={
          <form className="space-y-4" onSubmit={handleUsernameSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">用户名</label>
              <Input type="text" value={form.newUsername} onChange={(e) => setForm({ newUsername: e.target.value })} required placeholder="请输入新用户名" />
              <div className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">可包含字母、数字、下划线和连字符</div>
            </div>
            {form.usernameMsg && (
              <div className={`text-sm ${form.usernameMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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

      {/* 生成新备份码前密码验证 */}
      <ConfirmModal
        isOpen={modalOpen.genBackupPwd}
        onClose={() => closeModal('genBackupPwd')}
        onConfirm={handleGenBackupPwdSubmit}
        title="验证密码以生成新备份码"
        message={
          <form className="space-y-4" onSubmit={handleGenBackupPwdSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
              <Input
                type="password"
                value={form.genBackupPwd}
                onChange={(e) => setForm({ genBackupPwd: e.target.value })}
                required
                placeholder="请输入当前密码"
              />
            </div>
            {form.genBackupPwdMsg && <div className="text-sm text-red-600 dark:text-red-400">{form.genBackupPwdMsg}</div>}
          </form>
        }
        type="default"
        confirmText="验证"
        cancelText="取消"
      />

      {/* 更换邮箱 */}
      <ConfirmModal
        isOpen={modalOpen.email}
        onClose={() => closeModal('email')}
        onConfirm={handleEmailSubmit}
        title="更换邮箱"
        message={
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">更换邮箱后需通过新邮箱验证。</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">新邮箱地址</label>
              <Input type="email" value={form.newEmail} onChange={(e) => setForm({ newEmail: e.target.value })} required placeholder="请输入新邮箱" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
              <Input type="password" value={form.emailPwd} onChange={(e) => setForm({ emailPwd: e.target.value })} required placeholder="请输入当前密码" />
            </div>
            {form.emailMsg && (
              <div className={`text-sm ${form.emailMsg.includes('失败') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
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

      {/* 删除账户 */}
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
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
                <Input type="password" value={form.deletePwd} onChange={(e) => setForm({ deletePwd: e.target.value })} required placeholder="请输入当前密码" autoFocus />
              </div>
            )}
            {user?.totp_enabled && (
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">2FA 验证码 / 备份码</label>
                <Input type="text" value={form.deleteCode} onChange={(e) => setForm({ deleteCode: e.target.value })} required placeholder="6 位验证码或备份码" />
              </div>
            )}
            {form.deleteMsg && <div className="text-sm text-red-600 dark:text-red-400">{form.deleteMsg}</div>}
          </form>
        }
        type="danger"
        confirmText={form.deleteLoading ? '删除中...' : '确认删除'}
        cancelText="取消"
        isLoading={form.deleteLoading}
      />
    </div>
  );
}
