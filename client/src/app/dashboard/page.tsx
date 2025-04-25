'use client';

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type FormEvent,
  MouseEventHandler,
  ChangeEventHandler,
} from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import {
  deleteAccount,
  updatePassword,
  setup2FA,
  verify2FA,
  generateBackupCodes,
  getRemainingBackupCodes,
  disable2FA,
  updateUsername,
  updateEmail,
} from '@/services/api';
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { useRedirectHandler } from '@/hooks/useRedirectHandler';

const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), { ssr: false });

/* -------------------------------------------------------------------------- */
/* UI 组件（纯渲染）                                                           */
/* -------------------------------------------------------------------------- */

const Section = memo(({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4">
    <h2 className="text-lg font-medium text-neutral-900 dark:text-zinc-100">{title}</h2>
    {children}
  </section>
));

const Button = memo(
  ({
    onClick,
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    type = 'button',
  }: {
    onClick?: MouseEventHandler<HTMLButtonElement>;
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => {
    const base =
      'rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 transition ease-in-out duration-150';
    const sizeMap = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
    const variantMap = {
      primary: `bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      secondary: `bg-neutral-200 text-neutral-700 hover:bg-neutral-300 focus:ring-indigo-500 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      ghost: `bg-transparent text-neutral-600 hover:bg-neutral-100 focus:ring-indigo-500 dark:text-zinc-400 dark:hover:bg-zinc-700 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      link: `bg-transparent text-blue-600 underline hover:text-blue-700 focus:ring-indigo-500 dark:text-blue-400 dark:hover:text-blue-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } p-0`,
    };
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      >
        {children}
      </button>
    );
  },
);

const Input = memo(
  ({
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = '',
    ...props
  }: {
    type?: string;
    value: string | number;
    onChange: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    pattern?: string;
    maxLength?: number;
  }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      {...props}
    />
  ),
);

const NavItem = memo(
  ({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'bg-neutral-100 font-medium text-neutral-900 dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  ),
);

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

function DashboardContent() {
  const { user, logout, checkAuth } = useAuth();

  /* ------------------------------ state ---------------------------------- */
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'connections'>('general');

  /* password */
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  /* 2FA */
  const [showSetup2faPwdModal, setShowSetup2faPwdModal] = useState(false);
  const [setup2faPwd, setSetup2faPwd] = useState('');
  const [setup2faPwdMsg, setSetup2faPwdMsg] = useState('');

  const [show2faModal, setShow2faModal] = useState(false);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpToken, setTotpToken] = useState('');
  const [totpMsg, setTotpMsg] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  const [backupCount, setBackupCount] = useState<number | null>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  const [showGenBackupPwdModal, setShowGenBackupPwdModal] = useState(false);
  const [genBackupPwd, setGenBackupPwd] = useState('');
  const [genBackupPwdMsg, setGenBackupPwdMsg] = useState('');

  const [showDisable2faModal, setShowDisable2faModal] = useState(false);
  const [disableBackupCode, setDisableBackupCode] = useState('');
  const [disable2faLoading, setDisable2faLoading] = useState(false);
  const [disable2faMsg, setDisable2faMsg] = useState('');

  /* username */
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  /* email */
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  /* delete */
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  /* misc */
  const [showUserId, setShowUserId] = useState(false);

  /* --------------------------- effects ----------------------------------- */
  useEffect(() => {
    if (user?.totp_enabled) {
      getRemainingBackupCodes()
        .then((res) => setBackupCount(res.data.count))
        .catch(() => {});
    }
  }, [user?.totp_enabled]);

  /* --------------------------- handlers ---------------------------------- */
  const handleDeleteAccount = useCallback(async () => {
    setDeleteAccountLoading(true);
    try {
      await deleteAccount();
      alert('账号已删除');
      logout();
    } catch (err: any) {
      alert('删除失败：' + (err?.response?.data?.error || err?.message || '未知错误'));
    } finally {
      setDeleteAccountLoading(false);
    }
  }, [logout]);

  const handlePwdSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      if (!user) return;
      setPwdLoading(true);
      setPwdMsg('');
      try {
        await updatePassword(
          user.has_password ? { oldPassword: oldPwd, newPassword: newPwd } : { newPassword: newPwd },
        );
        setPwdMsg('密码设置成功！');
        setTimeout(() => {
          setShowPwdModal(false);
          setPwdMsg('');
          setNewPwd('');
          setOldPwd('');
        }, 1200);
      } catch (err: any) {
        setPwdMsg(err?.response?.data?.error || '设置失败');
      } finally {
        setPwdLoading(false);
      }
    },
    [user, oldPwd, newPwd],
  );

  const handleSetup2FA = useCallback(() => {
    setSetup2faPwd('');
    setSetup2faPwdMsg('');
    setShowSetup2faPwdModal(true);
  }, []);

  const handleVerify2FASubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      setTotpLoading(true);
      setTotpMsg('');
      try {
        await verify2FA(totpToken);
        setTotpMsg('2FA 启用成功！正在刷新...');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err: any) {
        setTotpMsg(err?.response?.data?.error || '验证码错误');
      } finally {
        setTotpLoading(false);
      }
    },
    [totpToken],
  );

  const handleGenBackupCodes = useCallback(() => {
    setGenBackupPwd('');
    setGenBackupPwdMsg('');
    setShowGenBackupPwdModal(true);
  }, []);

  const handleDisable2FASubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      setDisable2faLoading(true);
      setDisable2faMsg('');
      try {
        await disable2FA({ token: totpToken || undefined, backupCode: disableBackupCode || undefined });
        setDisable2faMsg('2FA已关闭，正在刷新...');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err: any) {
        setDisable2faMsg(err?.response?.data?.error || '关闭失败');
      } finally {
        setDisable2faLoading(false);
      }
    },
    [totpToken, disableBackupCode],
  );

  const handleUsernameSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      setUsernameLoading(true);
      setUsernameMsg('');
      try {
        await updateUsername(newUsername);
        setUsernameMsg('用户名设置成功！');
        await checkAuth();
        setTimeout(() => {
          setShowUsernameModal(false);
          setUsernameMsg('');
        }, 1200);
      } catch (err: any) {
        setUsernameMsg(err?.response?.data?.error || '设置失败');
      } finally {
        setUsernameLoading(false);
      }
    },
    [newUsername, checkAuth],
  );

  const handleGenBackupPwdSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      setGenBackupPwdMsg('');
      try {
        const res = await generateBackupCodes(genBackupPwd);
        setBackupCodes(res.data.codes);
        setBackupMsg('新备份码已生成，请妥善保存！');
        setBackupCount(res.data.codes.length);
        setShowGenBackupPwdModal(false);
        setShowBackupCodesModal(true);
        setGenBackupPwd('');
      } catch (err: any) {
        setGenBackupPwdMsg(err?.response?.data?.error || '密码验证失败');
      }
    },
    [genBackupPwd],
  );

  const handleEmailSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      setEmailLoading(true);
      setEmailMsg('');
      try {
        const res = await updateEmail({ newEmail, password: emailPwd });
        setEmailMsg(res.data.message || '验证邮件已发送至新邮箱，请查收。');
        await checkAuth();
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailMsg('');
          setNewEmail('');
          setEmailPwd('');
        }, 1500);
      } catch (err: any) {
        setEmailMsg(err?.response?.data?.error || '更换失败');
      } finally {
        setEmailLoading(false);
      }
    },
    [newEmail, emailPwd, checkAuth],
  );

  const handleBindGithub = useCallback(() => {
    window.open('/auth/github', 'github_oauth', 'width=1000,height=700');
  }, []);

  const handleBindGoogle = useCallback(() => {
    window.open('/auth/google', 'google_oauth', 'width=1000,height=700');
  }, []);

  /* --------------------------- helpers ----------------------------------- */
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

  /* --------------------------- mainContent -------------------------------- */
  const mainContent = useMemo(() => {
    if (!user) {
      return <LoadingIndicator />;
    }

    /* 通用设置 */
    const GeneralSection = () => (
      <div className="space-y-16">
        <Section title="账户信息">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">管理您的个人信息</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* 用户名 */}
            <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white p-6 dark:border-zinc-800/60 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100">用户名</h3>
                    <button
                      onClick={() => setShowUserId((v) => !v)}
                      className="text-neutral-400 hover:text-neutral-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                      title={showUserId ? '隐藏用户ID' : '显示用户ID'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        {showUserId ? (
                          <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        ) : (
                          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        )}
                        {!showUserId && (
                          <path
                            fillRule="evenodd"
                            d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400">{user.username || '未设置用户名'}</p>
                    {showUserId && (
                      <p className="font-mono text-xs text-neutral-400 dark:text-zinc-500">ID: {user.id}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowUsernameModal(true);
                    setNewUsername(user.username || '');
                    setUsernameMsg('');
                  }}
                  className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                >
                  {user.username ? '修改' : '设置'}
                </Button>
              </div>
            </div>

            {/* 邮箱 */}
            <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white p-6 dark:border-zinc-800/60 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100">邮箱地址</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-sm text-neutral-600 dark:text-zinc-400">{user.email}</p>
                    {renderEmailStatus()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEmailModal(true);
                    setNewEmail('');
                    setEmailPwd('');
                    setEmailMsg('');
                  }}
                  className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                >
                  更换
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* 安全设置 */}
        <Section title="安全设置">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">管理您的账户安全</p>
          <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200/60 bg-white p-6 dark:border-zinc-800/60 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100">账户密码</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                  {user.has_password ? '已设置密码' : '未设置密码'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPwdModal(true);
                  setOldPwd('');
                  setNewPwd('');
                  setPwdMsg('');
                }}
                className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                {user.has_password ? '修改' : '设置'}
              </Button>
            </div>
          </div>
        </Section>
      </div>
    );

    /* 两步验证 */
    const SecuritySection = () => (
      <div className="space-y-16">
        {/* 2FA */}
        <Section title="两步验证">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">增强您的账户安全性</p>
          <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p
                    className={`text-base ${
                      user.totp_enabled ? 'text-green-600 dark:text-green-400' : 'text-neutral-600 dark:text-zinc-400'
                    }`}
                  >
                    {user.totp_enabled ? '已启用两步验证' : '未启用两步验证'}
                  </p>
                  {user.totp_enabled && backupCount !== null && (
                    <p className="text-sm text-neutral-500 dark:text-zinc-400">剩余备份码：{backupCount} 个</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {user.totp_enabled && (
                    <Button onClick={handleGenBackupCodes} variant="secondary" size="sm">
                      生成新备份码
                    </Button>
                  )}
                  {!user.totp_enabled ? (
                    <Button onClick={handleSetup2FA} variant="primary" size="sm">
                      启用 2FA
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowDisable2faModal(true);
                        setTotpToken('');
                        setDisableBackupCode('');
                        setDisable2faMsg('');
                      }}
                      variant="danger"
                      size="sm"
                    >
                      关闭 2FA
                    </Button>
                  )}
                </div>
              </div>
              {backupMsg && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{backupMsg}</p>}
            </div>
          </div>
        </Section>

        {/* 危险操作 */}
        <Section title="危险操作">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">此区域的操作无法撤销</p>
          <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
            <div className="bg-red-50/60 px-8 py-6 dark:bg-red-900/10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h4 className="text-base font-medium text-red-900 dark:text-red-300">删除账户</h4>
                  <p className="text-sm text-red-700/90 dark:text-red-400/90">删除后，您的所有数据将被永久清除且无法恢复。</p>
                </div>
                <Button onClick={() => setShowDeleteAccountModal(true)} variant="danger" size="sm">
                  删除我的账户
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    );

    /* 账号绑定 */
    const ConnectionsSection = () => (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* GitHub */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-zinc-700/50 dark:bg-zinc-800/50">
              <svg className="h-5 w-5 text-neutral-700 dark:text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-zinc-100">GitHub</h3>
                <p className="text-sm text-neutral-500 dark:text-zinc-400">{user.github_id ? `ID: ${user.github_id}` : '未绑定'}</p>
              </div>
            </div>
            <div className="flex items-center justify-end px-6 py-4">
              {user.github_id ? (
                <span className="text-sm text-green-600 dark:text-green-400">已绑定</span>
              ) : (
                <Button onClick={handleBindGithub} variant="secondary" size="sm">
                  绑定 GitHub
                </Button>
              )}
            </div>
          </div>

          {/* Google */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-zinc-700/50 dark:bg-zinc-800/50">
              <svg className="h-5 w-5 text-neutral-700 dark:text-zinc-300" fill="currentColor" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.21 0 6.14.98 8.53 2.7l4.79-4.79C33.58 4.57 29.01 3 24 3 14.7 3 6.96 8.5 4.21 16.81l5.44 4.24C11.41 14.06 17.23 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.06 24.55c0-1.59-.14-3.12-.4-4.55H24v8.48h12.31c-.54 2.77-2.09 5.12-4.39 6.7l5.21 4.04C41.36 35.55 44.8 30.58 46.06 24.55z" />
                <path fill="#34A853" d="M9.65 28.95c-.46-.93-.72-1.95-.72-3.02s.26-2.09.72-3.02l-5.44-4.24C3.02 20.4 2 23.14 2 25.93s1.02 5.53 2.79 7.64l5.86-4.62z" />
                <path fill="#FBBC05" d="M24 44.5c4.89 0 9.04-1.63 12.01-4.38l-5.21-4.04c-1.6 1.08-3.64 1.72-5.8 1.72-6.77 0-12.59-4.56-14.35-10.71l-5.44 4.24C6.96 39.5 14.7 44.5 24 44.5z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-zinc-100">Google</h3>
                <p className="text-sm text-neutral-500 dark:text-zinc-400">{user.google_id ? `ID: ${user.google_id}` : '未绑定'}</p>
              </div>
            </div>
            <div className="flex items-center justify-end px-6 py-4">
              {user.google_id ? (
                <span className="text-sm text-green-600 dark:text-green-400">已绑定</span>
              ) : (
                <Button onClick={handleBindGoogle} variant="secondary" size="sm">
                  绑定 Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    switch (activeSection) {
      case 'general':
        return <GeneralSection />;
      case 'security':
        return <SecuritySection />;
      case 'connections':
        return <ConnectionsSection />;
      default:
        return null;
    }
  }, [
    user,
    activeSection,
    backupCount,
    backupMsg,
    renderEmailStatus,
    showUserId,
    handleGenBackupCodes,
    handleSetup2FA,
    handleDisable2FASubmit,
  ]);

  /* --------------------------- render ------------------------------------ */
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-zinc-100">用户中心</h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-zinc-400">管理您的账户设置和偏好</p>
        </div>

        <div className="flex gap-8">
          {/* 左侧导航 */}
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
            </div>
          </nav>

          {/* 主体内容 */}
          <section className="min-h-[36rem] flex-1">{mainContent}</section>
        </div>
      </main>

      <Footer />

      {/* ----------------------- 全部 ConfirmModal --------------------------- */}

      {/* 密码 */}
      <ConfirmModal
        isOpen={showPwdModal}
        onClose={() => setShowPwdModal(false)}
        onConfirm={handlePwdSubmit}
        title={user?.has_password ? '修改密码' : '设置密码'}
        message={
          <form className="space-y-4" onSubmit={handlePwdSubmit}>
            {user?.has_password && (
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">旧密码</label>
                <Input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">新密码</label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
            </div>
            {pwdMsg && (
              <div
                className={`text-sm ${
                  pwdMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {pwdMsg}
              </div>
            )}
          </form>
        }
        type="default"
        confirmText={pwdLoading ? '提交中...' : '提交'}
        cancelText="取消"
        isLoading={pwdLoading}
      />

      {/* 启用 2FA - 输入密码 */}
      <ConfirmModal
        isOpen={showSetup2faPwdModal}
        onClose={() => setShowSetup2faPwdModal(false)}
        onConfirm={async (e) => {
          if (e) e.preventDefault();
          setSetup2faPwdMsg('');
          try {
            const res = await setup2FA(setup2faPwd);
            setQr(res.data.qr);
            setSecret(res.data.secret);
            setBackupCodes(res.data.backupCodes);
            setShowSetup2faPwdModal(false);
            setShow2faModal(true);
            setSetup2faPwd('');
          } catch (err: any) {
            setSetup2faPwdMsg(err?.response?.data?.error || '密码验证失败');
          }
        }}
        title="验证密码以启用 2FA"
        message={
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
              <Input
                type="password"
                value={setup2faPwd}
                onChange={(e) => setSetup2faPwd(e.target.value)}
                required
                placeholder="请输入当前密码"
              />
            </div>
            {setup2faPwdMsg && <div className="text-sm text-red-600 dark:text-red-400">{setup2faPwdMsg}</div>}
          </form>
        }
        type="default"
        confirmText="验证"
        cancelText="取消"
      />

      {/* 启用 2FA - 扫码 & 输入验证码 */}
      <ConfirmModal
        isOpen={show2faModal}
        onClose={() => setShow2faModal(false)}
        onConfirm={handleVerify2FASubmit}
        title="启用二步验证"
        message={
          <form className="space-y-4" onSubmit={handleVerify2FASubmit}>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">请使用 Authenticator 扫描二维码或手动输入密钥。</p>
            {qr && (
              <img
                src={qr}
                alt="QR"
                className="mx-auto block h-40 w-40 rounded border border-neutral-300 p-1 dark:border-zinc-600"
              />
            )}
            <div className="text-center">
              <label className="block text-xs font-medium text-neutral-500 dark:text-zinc-500">密钥</label>
              <span className="select-all font-mono text-sm text-neutral-700 dark:text-zinc-300">{secret}</span>
            </div>
            <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <p className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300">重要提示：请妥善保存以下备份码！</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {backupCodes.map((code) => (
                  <span
                    key={code}
                    className="select-all rounded px-2 py-0.5 font-mono text-xs text-neutral-700 dark:text-zinc-200"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">输入 6 位验证码</label>
              <Input
                type="text"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                maxLength={6}
                required
                pattern="\d{6}"
                placeholder="123456"
              />
            </div>
            {totpMsg && (
              <div
                className={`text-sm ${
                  totpMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {totpMsg}
              </div>
            )}
          </form>
        }
        type="default"
        confirmText={totpLoading ? '验证中...' : '完成启用'}
        cancelText="取消"
        isLoading={totpLoading}
      />

      {/* 新备份码展示 */}
      <ConfirmModal
        isOpen={showBackupCodesModal}
        onClose={() => setShowBackupCodesModal(false)}
        onConfirm={() => setShowBackupCodesModal(false)}
        title="新备份码"
        message={
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-zinc-400">已生成新的备份码，请妥善保存。</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-neutral-200 p-3 dark:border-zinc-700">
              {backupCodes.map((code) => (
                <span
                  key={code}
                  className="select-all rounded bg-neutral-100 px-2 py-0.5 font-mono text-sm text-neutral-700 dark:bg-zinc-700 dark:text-zinc-200"
                >
                  {code}
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
        isOpen={showDisable2faModal}
        onClose={() => setShowDisable2faModal(false)}
        onConfirm={handleDisable2FASubmit}
        title="关闭二步验证"
        message={
          <form className="space-y-4" onSubmit={handleDisable2FASubmit}>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">输入 6 位验证码或一个备份码以关闭 2FA。</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">验证码 / 备份码</label>
              <Input
                type="text"
                value={totpToken || disableBackupCode}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,6}$/.test(value)) {
                    setTotpToken(value);
                    setDisableBackupCode('');
                  } else {
                    setDisableBackupCode(value);
                    setTotpToken('');
                  }
                }}
                placeholder="6 位验证码或备份码"
                required
              />
            </div>
            {disable2faMsg && (
              <div
                className={`text-sm ${
                  disable2faMsg.includes('成功') || disable2faMsg.includes('刷新')
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {disable2faMsg}
              </div>
            )}
          </form>
        }
        type="danger"
        confirmText={disable2faLoading ? '提交中...' : '确认关闭'}
        cancelText="取消"
        isLoading={disable2faLoading}
      />

      {/* 修改用户名 */}
      <ConfirmModal
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        onConfirm={handleUsernameSubmit}
        title={user?.username ? '修改用户名' : '设置用户名'}
        message={
          <form className="space-y-4" onSubmit={handleUsernameSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">用户名</label>
              <Input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                placeholder="请输入新用户名"
              />
              <div className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">可包含字母、数字、下划线和连字符</div>
            </div>
            {usernameMsg && (
              <div
                className={`text-sm ${
                  usernameMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {usernameMsg}
              </div>
            )}
          </form>
        }
        type="default"
        confirmText={usernameLoading ? '提交中...' : '提交'}
        cancelText="取消"
        isLoading={usernameLoading}
      />

      {/* 生成新备份码前密码验证 */}
      <ConfirmModal
        isOpen={showGenBackupPwdModal}
        onClose={() => setShowGenBackupPwdModal(false)}
        onConfirm={handleGenBackupPwdSubmit}
        title="验证密码以生成新备份码"
        message={
          <form className="space-y-4" onSubmit={handleGenBackupPwdSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
              <Input
                type="password"
                value={genBackupPwd}
                onChange={(e) => setGenBackupPwd(e.target.value)}
                required
                placeholder="请输入当前密码"
              />
            </div>
            {genBackupPwdMsg && <div className="text-sm text-red-600 dark:text-red-400">{genBackupPwdMsg}</div>}
          </form>
        }
        type="default"
        confirmText="验证"
        cancelText="取消"
      />

      {/* 更换邮箱 */}
      <ConfirmModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onConfirm={handleEmailSubmit}
        title="更换邮箱"
        message={
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">更换邮箱后需通过新邮箱验证。</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">新邮箱地址</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="请输入新邮箱"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">当前密码</label>
              <Input
                type="password"
                value={emailPwd}
                onChange={(e) => setEmailPwd(e.target.value)}
                required
                placeholder="请输入当前密码"
              />
            </div>
            {emailMsg && (
              <div
                className={`text-sm ${
                  emailMsg.includes('失败') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}
              >
                {emailMsg}
              </div>
            )}
          </form>
        }
        type="default"
        confirmText={emailLoading ? '提交中...' : '提交'}
        cancelText="取消"
        isLoading={emailLoading}
      />

      {/* 删除账户 */}
      <ConfirmModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        title="删除账户"
        message="您确定要删除您的账户吗？此操作将永久删除所有数据且无法恢复！"
        type="danger"
        confirmText="删除账户"
        cancelText="取消"
        isLoading={deleteAccountLoading}
      />
    </div>
  );
}

/* ---------------------------- default export ----------------------------- */

export default function DashboardPage() {
  const { isRedirecting } = useRedirectHandler();

  if (isRedirecting) {
    return <LoadingIndicator />;
  }

  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
