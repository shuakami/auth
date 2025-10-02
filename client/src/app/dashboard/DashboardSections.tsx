'use client';

import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import SessionManagement from './components/SessionManagement';
import BiometricSettings from '@/components/Auth/BiometricSettings';

import {
  User,
  Mail,
  Key,
  Shield,
  Github,
  Chrome,
  Fingerprint,
  Activity,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 基本设置                                                                   */
/* -------------------------------------------------------------------------- */

interface GeneralProps {
  user: Record<string, any> | null;
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
  <div className="flex flex-col gap-6">
    {/* 用户名 */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">用户名</p>
            <p className="mt-1 text-sm leading-tight text-muted-foreground">管理你的公开昵称与唯一标识</p>
            <div className="mt-2 text-sm text-foreground">
              {String(user?.username) || '未设置用户名'}
              <button
                onClick={toggleShowUserId}
                className="ml-2 text-muted-foreground hover:text-foreground"
                title={showUserId ? '隐藏用户ID' : '显示用户ID'}
                aria-label={showUserId ? '隐藏用户ID' : '显示用户ID'}
              >
                {showUserId ? '（隐藏 ID）' : '（显示 ID）'}
              </button>
            </div>
            {showUserId && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                ID: {String(user?.id)}
              </p>
            )}
          </div>
        </div>
        <div className="flex-none shrink-0">
          <Button variant="outline" onClick={openUsernameModal} className="px-4 py-2 text-sm">
            {user?.username ? '修改' : '设置'}
          </Button>
        </div>
      </div>
    </div>

    {/* 邮箱 */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">邮箱地址</p>
            <p className="mt-1 text-sm leading-tight text-muted-foreground">用于登录与账户通知</p>
            <div className="mt-2 text-sm text-foreground flex flex-wrap items-center gap-2">
              <span>{String(user?.email)}</span>
              {renderEmailStatus()}
            </div>
          </div>
        </div>
        <div className="flex-none shrink-0">
          <Button variant="outline" onClick={openEmailModal} className="px-4 py-2 text-sm">
            更换
          </Button>
        </div>
      </div>
    </div>

    {/* 密码 */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Key className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">账户密码</p>
            <p className="mt-1 text-sm leading-tight text-muted-foreground">用于邮箱密码登录</p>
            <p className="mt-2 text-sm text-foreground">{user?.has_password ? '已设置密码' : '未设置密码'}</p>
          </div>
        </div>
        <div className="flex-none shrink-0">
          <Button variant="outline" onClick={openPwdModal} className="px-4 py-2 text-sm">
            {user?.has_password ? '修改' : '设置'}
          </Button>
        </div>
      </div>
    </div>
  </div>
);
GeneralSection.displayName = 'GeneralSection';

/* -------------------------------------------------------------------------- */
/* 安全与登录                                                                 */
/* -------------------------------------------------------------------------- */

interface SecurityProps {
  user: Record<string, any> | null;
  backupCount: number | null;
  backupMsg: string;
  handleGenBackupCodes: () => void;
  handleSetup2FA: () => void;
  openDisable2faModal: () => void;
}

export const SecuritySection = ({
  user,
  backupCount,
  backupMsg,
  handleGenBackupCodes,
  handleSetup2FA,
  openDisable2faModal,
}: SecurityProps) => (
  <div className="flex flex-col gap-6">
    {/* 2FA */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">两步验证（2FA）</p>
            <p className="mt-1 text-sm leading-tight text-muted-foreground">为登录增加第二道安全防线</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium ${user?.totp_enabled ? 'text-emerald-700' : 'text-muted-foreground'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${user?.totp_enabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {user?.totp_enabled ? '已启用' : '未启用'}
              </span>
              {user && user.totp_enabled && typeof backupCount === 'number' && (
                <span className="text-muted-foreground text-xs">剩余备份码：{String(backupCount)} 个</span>
              )}
            </div>
            {backupMsg && <p className="mt-2 text-sm text-emerald-600">{backupMsg}</p>}
          </div>
        </div>
        <div className="flex-none shrink-0">
          {user?.totp_enabled ? (
            <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
              <Button variant="outline" onClick={handleGenBackupCodes} className="px-3 py-2 text-sm">
                生成备份码
              </Button>
              <Button variant="error" onClick={openDisable2faModal} className="px-3 py-2 text-sm">
                关闭 2FA
              </Button>
            </div>
          ) : (
            <Button onClick={handleSetup2FA} className="px-3 py-2 text-sm">
              启用 2FA
            </Button>
          )}
        </div>
      </div>
    </div>

    {/* 生物认证 */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex items-start gap-4">
        <Fingerprint className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-foreground">生物验证</p>
          <p className="mt-1 text-sm leading-tight text-muted-foreground">指纹、Face ID 或安全密钥</p>
          <div className="mt-5">
            <BiometricSettings />
          </div>
        </div>
      </div>
    </div>

    {/* 会话管理 */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="mb-4 flex items-center gap-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-base font-medium text-foreground">已登录设备</p>
          <p className="mt-1 text-sm leading-tight text-muted-foreground">管理您当前已登录的设备会话</p>
        </div>
      </div>
      <SessionManagement />
    </div>
  </div>
);
SecuritySection.displayName = 'SecuritySection';

/* -------------------------------------------------------------------------- */
/* 账号绑定                                                                   */
/* -------------------------------------------------------------------------- */

interface ConnectionsProps {
  user: Record<string, any> | null;
  handleBindGithub: () => void;
  handleBindGoogle: () => void;
}

export const ConnectionsSection = ({
  user,
  handleBindGithub,
  handleBindGoogle,
}: ConnectionsProps) => (
  <div className="flex flex-col gap-6">
    {/* GitHub */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Github className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">GitHub</p>
            <p className="mt-1 text-sm leading-tight text-muted-foreground">绑定 GitHub 以便快速登录</p>
            <p className="mt-2 text-sm text-foreground">
              {user && user.github_id ? `已绑定（ID: ${String(user.github_id)}）` : '未绑定'}
            </p>
          </div>
        </div>
        <div className="flex-none shrink-0">
          {user && user.github_id ? (
            <span className="text-sm text-emerald-600">已绑定</span>
          ) : (
            <Button variant="outline" onClick={handleBindGithub} className="px-4 py-2 text-sm">
              绑定 GitHub
            </Button>
          )}
        </div>
      </div>
    </div>

    {/* Google */}
    <div className="rounded-xl bg-card pl-5 pr-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Chrome className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">Google</p>
            <p className="mt-1 text-sm leading-tight text-muted-foreground">绑定 Google 以便快速登录</p>
            <p className="mt-2 text-sm text-foreground">
              {user && user.google_id ? `已绑定（ID: ${String(user.google_id)}）` : '未绑定'}
            </p>
          </div>
        </div>
        <div className="flex-none shrink-0">
          {user && user.google_id ? (
            <span className="text-sm text-emerald-600">已绑定</span>
          ) : (
            <Button variant="outline" onClick={handleBindGoogle} className="px-4 py-2 text-sm">
              绑定 Google
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);
ConnectionsSection.displayName = 'ConnectionsSection';