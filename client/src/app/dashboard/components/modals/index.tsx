/**
 * Dashboard 弹窗组件集合
 */

'use client';

import React from 'react';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { Modal, ConfirmModal, FormModal, Input } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { GoogleIcon, AppleIcon } from '../icons';
import { DashboardCopyButton } from '../shared';
import { useI18n, interpolate } from '../../i18n';
import type { SystemUser, OAuthApp, SignInMethodType } from '../../types';

// ==================== 账户相关弹窗 ====================

// 头像说明弹窗
interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateEmail: () => void;
}

export function AvatarModal({ isOpen, onClose, onUpdateEmail }: AvatarModalProps) {
  const { t } = useI18n();
  
  const handleUpdateEmail = () => {
    onClose();
    onUpdateEmail();
  };

  const handleOpenGravatar = () => {
    window.open('https://gravatar.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.modals.avatarTitle} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {t.modals.avatarDescription}
        </p>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.modals.avatarHowTo}</p>
          <ul className="text-sm text-muted space-y-1.5 list-disc list-inside">
            <li>{t.modals.avatarOption1}</li>
            <li>{t.modals.avatarOption2}</li>
          </ul>
        </div>

        <p className="text-xs text-muted">
          {t.modals.avatarGravatarHint}
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleUpdateEmail}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
          >
            {t.account.updateEmail}
          </button>
          <button
            onClick={handleOpenGravatar}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Gravatar
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface EditNameModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function EditNameModal({ isOpen, value, onChange, onClose, onSubmit, loading }: EditNameModalProps) {
  const { t } = useI18n();
  return (
    <FormModal 
      isOpen={isOpen} 
      onClose={onClose} 
      onSubmit={onSubmit} 
      title={t.modals.editName} 
      cancelText={t.common.cancel} 
      submitText={t.common.save}
      isLoading={loading}
    >
      <Input
        label={t.modals.fullNameLabel}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.modals.fullNamePlaceholder}
        autoFocus
        disabled={loading}
      />
    </FormModal>
  );
}

interface UpdateEmailModalProps {
  isOpen: boolean;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function UpdateEmailModal({ 
  isOpen, 
  email, 
  password,
  onEmailChange, 
  onPasswordChange,
  onClose, 
  onSubmit,
  loading,
}: UpdateEmailModalProps) {
  const { t } = useI18n();
  return (
    <FormModal 
      isOpen={isOpen} 
      onClose={onClose} 
      onSubmit={onSubmit} 
      title={t.modals.updateEmail} 
      cancelText={t.common.cancel} 
      submitText={t.account.updateEmail}
      isLoading={loading}
    >
      <div className="space-y-4">
        <Input
          label={t.modals.emailLabel}
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t.modals.emailPlaceholder}
          autoFocus
          disabled={loading}
        />
        <Input
          label={t.modals.currentPassword}
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={t.modals.currentPasswordPlaceholder}
          disabled={loading}
        />
        <p className="text-xs text-muted">{t.modals.emailVerificationHint}</p>
      </div>
    </FormModal>
  );
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.modals.subscription} size="sm">
      <div className="space-y-6">
        <div>
          <div className="text-4xl font-bold tracking-tight">{t.modals.free}</div>
          <div className="text-muted text-sm mt-0.5">{t.modals.forever}</div>
        </div>
        <div className="h-px bg-foreground/10" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted text-xs mb-1">{t.users.status}</div>
            <div>{t.modals.active}</div>
          </div>
          <div>
            <div className="text-muted text-xs mb-1">{t.modals.since}</div>
            <div>Oct 2024</div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
          >
            {t.common.close}
          </button>
          <button
            onClick={() => toast(t.modals.noPlansAvailable)}
            className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            {t.common.upgrade}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== 登录方式弹窗 ====================

interface DisableMethodModalProps {
  isOpen: boolean;
  method: SignInMethodType;
  onClose: () => void;
  onConfirm: () => void;
}

export function DisableMethodModal({ isOpen, method, onClose, onConfirm }: DisableMethodModalProps) {
  const { t } = useI18n();
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} size="sm">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
            {method === 'Email and password' && <Mail className="w-6 h-6" />}
            {method === '𝕏' && (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 2H1l8.26 11.015L1.45 22H4.1l6.388-7.349L16 22h7l-8.608-11.478L21.8 2h-2.65l-5.986 6.886zm9 18L5 4h2l12 16z" />
              </svg>
            )}
          </div>
        </div>
        <h2 className="text-lg font-medium text-regular">{interpolate(t.modals.disableMethodTitle, { method: method || '' })}</h2>
        <p className="text-sm text-muted mt-2">{t.modals.disableMethodDesc}</p>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={onConfirm}
          className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          {t.common.disable}
        </button>
      </div>
    </Modal>
  );
}

interface ConnectMethodModalProps {
  isOpen: boolean;
  method: SignInMethodType;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConnectMethodModal({ isOpen, method, onClose, onConfirm }: ConnectMethodModalProps) {
  const { t } = useI18n();
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} size="sm">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
            {method === 'Google' && <GoogleIcon className="w-6 h-6" />}
            {method === 'Apple' && <AppleIcon className="w-6 h-6" />}
          </div>
        </div>
        <h2 className="text-lg font-medium text-regular">{interpolate(t.modals.connectMethodTitle, { method: method || '' })}</h2>
        <p className="text-sm text-muted mt-2">{interpolate(t.modals.connectMethodDesc, { method: method || '' })}</p>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={onConfirm}
          className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          {t.common.connect}
        </button>
      </div>
    </Modal>
  );
}

// ==================== 安全相关弹窗 ====================

interface ChangePasswordModalProps {
  isOpen: boolean;
  hasPassword: boolean;
  oldPassword: string;
  newPassword: string;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function ChangePasswordModal({
  isOpen,
  hasPassword,
  oldPassword,
  newPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onClose,
  onSubmit,
  loading,
}: ChangePasswordModalProps) {
  const { t } = useI18n();
  const title = hasPassword ? t.modals.changePassword : t.modals.setPassword;
  
  return (
    <FormModal 
      isOpen={isOpen} 
      onClose={onClose} 
      onSubmit={onSubmit} 
      title={title} 
      cancelText={t.common.cancel} 
      submitText={t.common.save}
      isLoading={loading}
    >
      <div className="space-y-4">
        {hasPassword && (
          <Input
            label={t.modals.currentPassword}
            type="password"
            value={oldPassword}
            onChange={(e) => onOldPasswordChange(e.target.value)}
            placeholder={t.modals.currentPasswordPlaceholder}
            autoFocus
            disabled={loading}
          />
        )}
        <Input
          label={t.modals.newPassword}
          type="password"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          placeholder={t.modals.newPasswordPlaceholder}
          autoFocus={!hasPassword}
          disabled={loading}
        />
      </div>
    </FormModal>
  );
}

interface SetPasswordModalProps {
  isOpen: boolean;
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function SetPasswordModal({
  isOpen,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  onClose,
  onSubmit,
}: SetPasswordModalProps) {
  const { t } = useI18n();
  return (
    <FormModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} title={t.modals.setPassword} cancelText={t.common.cancel} submitText={t.modals.updatePassword}>
      <div className="space-y-4">
        <Input
          label={t.modals.newPassword}
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={t.modals.newPasswordPlaceholder}
          autoFocus
        />
        <Input
          label={t.modals.confirmPassword}
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder={t.modals.confirmPasswordPlaceholder}
        />
      </div>
    </FormModal>
  );
}

interface SignOutAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SignOutAllModal({ isOpen, onClose, onConfirm }: SignOutAllModalProps) {
  const { t } = useI18n();
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t.modals.signOutAllTitle}
      description={t.modals.signOutAllDesc}
      confirmText={t.modals.signOutAll}
      cancelText={t.common.cancel}
      variant="danger"
    />
  );
}

// ==================== 用户管理弹窗 ====================

interface UserDetailModalProps {
  isOpen: boolean;
  user: SystemUser | null;
  editing: boolean;
  editRole: string;
  onEditRoleChange: (role: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

export function UserDetailModal({
  isOpen,
  user,
  editing,
  editRole,
  onEditRoleChange,
  onClose,
  onEdit,
  onSave,
  onCancelEdit,
}: UserDetailModalProps) {
  const { t } = useI18n();
  if (!user) return null;

  const getRoleName = (role: string) => {
    const roleKey = role as keyof typeof t.users.roles;
    return t.users.roles[roleKey] || role.replace('_', ' ');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user.username} size="md">
      <div className="space-y-5">
        {editing ? (
          <div className="space-y-4">
            <Input label={t.modals.username} type="text" defaultValue={user.username} />
            <Input label={t.users.email} type="email" defaultValue={user.email} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-regular">{t.users.role}</label>
              <Select
                value={editRole}
                onChange={onEditRoleChange}
                options={[
                  { value: 'user', label: t.users.roles.user },
                  { value: 'admin', label: t.users.roles.admin },
                  { value: 'super_admin', label: t.users.roles.super_admin },
                ]}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t.users.email}</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t.users.role}</span>
              <span>{getRoleName(user.role)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t.users.created}</span>
              <span>{user.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t.users.emailVerified}</span>
              <span>{user.emailVerified ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t.users.twoFactorEnabled}</span>
              <span>{user.twoFactorEnabled ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t.users.providers}</span>
              <span className="capitalize">{user.providers.join(', ')}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          {editing ? (
            <>
              <button
                onClick={onCancelEdit}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={onSave}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                {t.common.save}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
              >
                {t.common.edit}
              </button>
              <button className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors">
                {t.common.delete}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface AddUserModalProps {
  isOpen: boolean;
  email: string;
  username: string;
  password: string;
  role: string;
  onEmailChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function AddUserModal({
  isOpen,
  email,
  username,
  password,
  role,
  onEmailChange,
  onUsernameChange,
  onPasswordChange,
  onRoleChange,
  onClose,
  onSubmit,
}: AddUserModalProps) {
  const { t } = useI18n();
  return (
    <FormModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} title={t.users.addUser} cancelText={t.common.cancel} submitText={t.users.addUser}>
      <div className="space-y-4">
        <Input
          label={t.modals.username}
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder={t.modals.usernamePlaceholder}
          autoFocus
        />
        <Input
          label={t.modals.emailLabel}
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t.modals.emailPlaceholder}
        />
        <Input
          label={t.modals.password}
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={t.modals.passwordPlaceholder}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-regular">{t.users.role}</label>
          <Select
            value={role}
            onChange={onRoleChange}
            options={[
              { value: 'user', label: t.users.roles.user },
              { value: 'admin', label: t.users.roles.admin },
              { value: 'super_admin', label: t.users.roles.super_admin },
            ]}
          />
        </div>
      </div>
    </FormModal>
  );
}

// ==================== OAuth 弹窗 ====================

interface OAuthSettingsModalProps {
  isOpen: boolean;
  app: OAuthApp | null;
  editing: boolean;
  editName: string;
  editStatus: string;
  visibleSecrets: Set<number>;
  onEditNameChange: (value: string) => void;
  onEditStatusChange: (value: string) => void;
  onToggleSecret: (id: number) => void;
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

export function OAuthSettingsModal({
  isOpen,
  app,
  editing,
  editName,
  editStatus,
  visibleSecrets,
  onEditNameChange,
  onEditStatusChange,
  onToggleSecret,
  onClose,
  onEdit,
  onSave,
  onCancelEdit,
}: OAuthSettingsModalProps) {
  const { t } = useI18n();
  if (!app) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? t.modals.editApplication : app.name} size="md">
      <div className="space-y-5">
        {editing ? (
          <div className="space-y-4">
            <Input label={t.oauth.appName} type="text" value={editName} onChange={(e) => onEditNameChange(e.target.value)} />
            <Input label={t.oauth.descriptionOptional} type="text" defaultValue={app.description} placeholder={t.modals.optionalDescription} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-regular">{t.users.status}</label>
              <Select
                value={editStatus}
                onChange={onEditStatusChange}
                options={[
                  { value: 'active', label: t.modals.active },
                  { value: 'disabled', label: t.common.disable },
                ]}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted uppercase tracking-wide">{t.oauth.clientId}</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="flex-1 text-sm font-mono text-regular truncate">{app.clientId}</code>
                  <DashboardCopyButton text={app.clientId} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wide">{t.oauth.clientSecret}</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="flex-1 text-sm font-mono text-regular truncate">
                    {visibleSecrets.has(app.id) ? app.clientSecret : '••••••••••••••••••••••••'}
                  </code>
                  <button onClick={() => onToggleSecret(app.id)} className="cursor-pointer text-muted hover:text-primary transition-colors">
                    {visibleSecrets.has(app.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <DashboardCopyButton text={app.clientSecret} />
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">{t.users.status}</span>
                <span className={app.enabled ? '' : 'text-muted'}>{app.enabled ? t.modals.active : t.common.disable}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t.oauth.authorizations}</span>
                <span>{app.usageCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t.users.created}</span>
                <span>{app.createdAt}</span>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-3">
          {editing ? (
            <>
              <button
                onClick={onCancelEdit}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={onSave}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                {t.common.save}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
              >
                {t.common.edit}
              </button>
              <button className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors">
                {t.common.delete}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
