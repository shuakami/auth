'use client';

import { Section, Button } from './DashboardUI';
import Image from 'next/image';
import type { ReactNode } from 'react';
import SessionManagement from './components/SessionManagement';

/* -------------------------------------------------------------------------- */
/* 通用设置                                                                   */
/* -------------------------------------------------------------------------- */

interface GeneralProps {
  user: any | null;
  showUserId: boolean;
  toggleShowUserId: () => void;
  openUsernameModal: () => void;
  openEmailModal: () => void;
  openPwdModal: () => void;
  renderEmailStatus: () => ReactNode;
}

export const GeneralSection = ({
  user,
  showUserId,
  toggleShowUserId,
  openUsernameModal,
  openEmailModal,
  openPwdModal,
  renderEmailStatus,
}: GeneralProps) => (
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
                  onClick={toggleShowUserId}
                  className="text-neutral-400 hover:text-neutral-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                  title={showUserId ? '隐藏用户ID' : '显示用户ID'}
                >
                  {showUserId ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className="h-4 w-4">
                      <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className="h-4 w-4">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-neutral-600 dark:text-zinc-400">{user?.username || '未设置用户名'}</p>
                {showUserId && (
                  <p className="font-mono text-xs text-neutral-400 dark:text-zinc-500">ID: {user?.id}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={openUsernameModal}
              className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              {user?.username ? '修改' : '设置'}
            </Button>
          </div>
        </div>

        {/* 邮箱 */}
        <div className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white p-6 dark:border-zinc-800/60 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100">邮箱地址</h3>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-neutral-600 dark:text-zinc-400">{user?.email}</p>
                {renderEmailStatus()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={openEmailModal}
              className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              更换
            </Button>
          </div>
        </div>
      </div>
    </Section>

    {/* 安全设置（密码） */}
    <Section title="安全设置">
      <p className="text-sm text-neutral-500 dark:text-zinc-400">管理您的账户安全</p>
      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200/60 bg-white p-6 dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100">账户密码</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
              {user?.has_password ? '已设置密码' : '未设置密码'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={openPwdModal}
            className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
          >
            {user?.has_password ? '修改' : '设置'}
          </Button>
        </div>
      </div>
    </Section>
  </div>
);
GeneralSection.displayName = 'GeneralSection';

/* -------------------------------------------------------------------------- */
/* 两步验证 / 危险操作                                                        */
/* -------------------------------------------------------------------------- */

interface SecurityProps {
  user: any | null;
  backupCount: number | null;
  backupMsg: string;
  handleGenBackupCodes: () => void;
  handleSetup2FA: () => void;
  openDisable2faModal: () => void;
  handleDeleteAccountClick: () => void;
}

export const SecuritySection = ({
  user,
  backupCount,
  backupMsg,
  handleGenBackupCodes,
  handleSetup2FA,
  openDisable2faModal,
  handleDeleteAccountClick,
}: SecurityProps) => (
  <div className="space-y-16">
    <Section title="两步验证">
      <p className="text-sm text-neutral-500 dark:text-zinc-400">增强您的账户安全性</p>
      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p
                className={`text-base ${
                  user?.totp_enabled ? 'text-green-600 dark:text-green-400' : 'text-neutral-600 dark:text-zinc-400'
                }`}
              >
                {user?.totp_enabled ? '已启用两步验证' : '未启用两步验证'}
              </p>
              {user?.totp_enabled && backupCount !== null && (
                <p className="text-sm text-neutral-500 dark:text-zinc-400">剩余备份码：{backupCount} 个</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {user?.totp_enabled && (
                <Button onClick={handleGenBackupCodes} variant="secondary" size="sm">
                  生成新备份码
                </Button>
              )}
              {!user?.totp_enabled ? (
                <Button onClick={handleSetup2FA} variant="primary" size="sm">
                  启用 2FA
                </Button>
              ) : (
                <Button onClick={openDisable2faModal} variant="danger" size="sm">
                  关闭 2FA
                </Button>
              )}
            </div>
          </div>
          {backupMsg && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{backupMsg}</p>}
        </div>
      </div>
    </Section>
    
    <SessionManagement />

    {/* 危险操作 */}
    <Section title="危险操作">
      <p className="text-sm text-neutral-500 dark:text-zinc-400">此区域的操作无法撤销</p>
      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
        <div className="bg-red-50/60 px-8 py-6 dark:bg-red-900/10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h4 className="text-base font-medium text-red-900 dark:text-red-300">删除账户</h4>
              <p className="text-sm text-red-700/90 dark:text-red-400/90">
                删除后，您的所有数据将被永久清除且无法恢复。
              </p>
            </div>
            <Button onClick={handleDeleteAccountClick} variant="danger" size="sm">
              删除我的账户
            </Button>
          </div>
        </div>
      </div>
    </Section>
  </div>
);
SecuritySection.displayName = 'SecuritySection';

/* -------------------------------------------------------------------------- */
/* 账号绑定                                                                   */
/* -------------------------------------------------------------------------- */

interface ConnectionsProps {
  user: any | null;
  handleBindGithub: () => void;
  handleBindGoogle: () => void;
}

export const ConnectionsSection = ({
  user,
  handleBindGithub,
  handleBindGoogle,
}: ConnectionsProps) => (
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
            <p className="text-sm text-neutral-500 dark:text-zinc-400">
              {user?.github_id ? `ID: ${user.github_id}` : '未绑定'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end px-6 py-4">
          {user?.github_id ? (
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
          <svg
            height="20"
            viewBox="0 0 24 24"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-neutral-700 dark:text-zinc-300"
            style={{ flex: '0 0 auto', lineHeight: 1 }}
          >
            <title>Google</title>
            <path
              d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z"
              fill="#4285F4"
            />
            <path
              d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z"
              fill="#FBBC05"
            />
            <path
              d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z"
              fill="#EB4335"
            />
          </svg>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-zinc-100">Google</h3>
            <p className="text-sm text-neutral-500 dark:text-zinc-400">
              {user?.google_id ? `ID: ${user.google_id}` : '未绑定'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end px-6 py-4">
          {user?.google_id ? (
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
ConnectionsSection.displayName = 'ConnectionsSection';
