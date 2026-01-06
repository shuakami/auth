/**
 * 账户页面 - /dashboard
 * 使用真实 API 进行账户管理
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { AccountTab } from './components/tabs/AccountTab';
import {
  EditNameModal,
  UpdateEmailModal,
  SubscriptionModal,
  DisableMethodModal,
  ConnectMethodModal,
  ChangePasswordModal,
  AvatarModal,
} from './components/modals';
import { useAccount, useOAuthConnect } from './hooks';
import { useToast } from '@/components/ui/Toast';
import { useI18n, interpolate } from './i18n';
import type { SignInMethodType } from './types';

export default function AccountPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // 账户 Hook
  const {
    user,
    usernameForm,
    updateUsernameFn,
    resetUsernameForm,
    emailForm,
    updateEmailFn,
    resetEmailForm,
    passwordForm,
    updatePasswordFn,
    resetPasswordForm,
    hasPassword,
    isEmailVerified,
  } = useAccount();

  // OAuth 连接 Hook
  const { bindGithub, bindGoogle, isGithubLinked, isGoogleLinked } = useOAuthConnect();

  // 弹窗状态
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showUpdateEmailDialog, setShowUpdateEmailDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showDisableMethodDialog, setShowDisableMethodDialog] = useState(false);
  const [showConnectMethodDialog, setShowConnectMethodDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  // 表单值
  const [editNameValue, setEditNameValue] = useState('');
  const [editEmailValue, setEditEmailValue] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<SignInMethodType>(null);

  // 同步用户数据到表单
  useEffect(() => {
    if (user) {
      setEditNameValue(user.name || '');
      setEditEmailValue(user.email || '');
    }
  }, [user]);

  // 处理用户名提交
  const handleNameSubmit = useCallback(async () => {
    const success = await updateUsernameFn(editNameValue);
    if (success) {
      setShowEditNameDialog(false);
      resetUsernameForm();
      toast(t.toast.nameUpdated || 'Name updated');
    } else if (usernameForm.error) {
      toast(usernameForm.error, 'error');
    }
  }, [editNameValue, updateUsernameFn, resetUsernameForm, toast, t, usernameForm.error]);

  // 处理邮箱提交
  const handleEmailSubmit = useCallback(async () => {
    const success = await updateEmailFn(editEmailValue, emailPassword);
    if (success) {
      setShowUpdateEmailDialog(false);
      setEmailPassword('');
      resetEmailForm();
      toast(t.toast.emailUpdated || 'Verification email sent');
    } else if (emailForm.error) {
      toast(emailForm.error, 'error');
    }
  }, [editEmailValue, emailPassword, updateEmailFn, resetEmailForm, toast, t, emailForm.error]);

  // 处理密码提交
  const handlePasswordSubmit = useCallback(async () => {
    const success = await updatePasswordFn(hasPassword ? oldPassword : undefined, newPassword);
    if (success) {
      setShowChangePasswordDialog(false);
      setOldPassword('');
      setNewPassword('');
      resetPasswordForm();
      toast(t.toast.passwordUpdated);
    } else if (passwordForm.error) {
      toast(passwordForm.error, 'error');
    }
  }, [hasPassword, oldPassword, newPassword, updatePasswordFn, resetPasswordForm, toast, t, passwordForm.error]);

  // 关闭弹窗时重置状态
  const handleCloseNameDialog = useCallback(() => {
    setShowEditNameDialog(false);
    resetUsernameForm();
    if (user) setEditNameValue(user.name || '');
  }, [resetUsernameForm, user]);

  const handleCloseEmailDialog = useCallback(() => {
    setShowUpdateEmailDialog(false);
    setEmailPassword('');
    resetEmailForm();
    if (user) setEditEmailValue(user.email || '');
  }, [resetEmailForm, user]);

  const handleClosePasswordDialog = useCallback(() => {
    setShowChangePasswordDialog(false);
    setOldPassword('');
    setNewPassword('');
    resetPasswordForm();
  }, [resetPasswordForm]);

  // 处理 OAuth 连接
  const handleConnectMethod = useCallback((method: SignInMethodType) => {
    setSelectedMethod(method);
    setShowConnectMethodDialog(true);
  }, []);

  // 未登录时不渲染
  if (!user) return null;

  return (
    <>
      <AccountTab
        user={user}
        isEmailVerified={isEmailVerified}
        hasPassword={hasPassword}
        isGithubLinked={isGithubLinked}
        isGoogleLinked={isGoogleLinked}
        onEditName={() => setShowEditNameDialog(true)}
        onUpdateEmail={() => setShowUpdateEmailDialog(true)}
        onChangePassword={() => setShowChangePasswordDialog(true)}
        onManageSubscription={() => setShowSubscriptionDialog(true)}
        onDisableMethod={(method) => {
          setSelectedMethod(method);
          setShowDisableMethodDialog(true);
        }}
        onConnectMethod={handleConnectMethod}
        onBindGithub={bindGithub}
        onEditAvatar={() => setShowAvatarDialog(true)}
      />

      {/* 编辑用户名 */}
      <EditNameModal
        isOpen={showEditNameDialog}
        value={editNameValue}
        onChange={setEditNameValue}
        onClose={handleCloseNameDialog}
        onSubmit={handleNameSubmit}
        loading={usernameForm.loading}
      />

      {/* 更新邮箱 */}
      <UpdateEmailModal
        isOpen={showUpdateEmailDialog}
        email={editEmailValue}
        password={emailPassword}
        onEmailChange={setEditEmailValue}
        onPasswordChange={setEmailPassword}
        onClose={handleCloseEmailDialog}
        onSubmit={handleEmailSubmit}
        loading={emailForm.loading}
      />

      {/* 修改/设置密码 */}
      <ChangePasswordModal
        isOpen={showChangePasswordDialog}
        hasPassword={hasPassword}
        oldPassword={oldPassword}
        newPassword={newPassword}
        onOldPasswordChange={setOldPassword}
        onNewPasswordChange={setNewPassword}
        onClose={handleClosePasswordDialog}
        onSubmit={handlePasswordSubmit}
        loading={passwordForm.loading}
      />

      {/* 订阅管理 */}
      <SubscriptionModal
        isOpen={showSubscriptionDialog}
        onClose={() => setShowSubscriptionDialog(false)}
      />

      {/* 禁用登录方式 */}
      <DisableMethodModal
        isOpen={showDisableMethodDialog}
        method={selectedMethod}
        onClose={() => setShowDisableMethodDialog(false)}
        onConfirm={() => {
          const method = selectedMethod;
          setShowDisableMethodDialog(false);
          toast(interpolate(t.toast.disabled, { method: method || '' }));
        }}
      />

      {/* 连接登录方式 */}
      <ConnectMethodModal
        isOpen={showConnectMethodDialog}
        method={selectedMethod}
        onClose={() => setShowConnectMethodDialog(false)}
        onConfirm={() => {
          setShowConnectMethodDialog(false);
          if (selectedMethod === 'Google') {
            bindGoogle();
          } else if (selectedMethod === 'Apple') {
            toast('Apple 登录暂不支持');
          }
        }}
      />

      {/* 头像说明 */}
      <AvatarModal
        isOpen={showAvatarDialog}
        onClose={() => setShowAvatarDialog(false)}
        onUpdateEmail={() => setShowUpdateEmailDialog(true)}
      />
    </>
  );
}
