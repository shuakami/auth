/**
 * 用户管理页面 - /dashboard-test/user
 */

'use client';

import React, { useState } from 'react';
import { UserTab } from '../components/tabs/UserTab';
import { UserDetailModal, AddUserModal } from '../components/modals';
import { CustomToast } from '../components/CustomToast';
import { useToastMessage } from '../hooks';
import { useI18n } from '../i18n';
import { mockUsers } from '../data/mock';
import type { SystemUser } from '../types';

export default function UserPage() {
  const { t } = useI18n();

  // 弹窗状态
  const [showUserDetailDialog, setShowUserDetailDialog] = useState(false);
  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);

  // 用户详情状态
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [editUserRole, setEditUserRole] = useState('user');

  // 添加用户表单
  const [inviteEmail, setInviteEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  // Toast
  const { toast, showToast } = useToastMessage();

  return (
    <>
      <UserTab
        users={mockUsers}
        onAddUser={() => setShowInviteUserDialog(true)}
        onUserClick={(user) => {
          setSelectedUser(user);
          setShowUserDetailDialog(true);
        }}
      />

      <UserDetailModal
        isOpen={showUserDetailDialog}
        user={selectedUser}
        editing={editingUser}
        editRole={editUserRole}
        onEditRoleChange={setEditUserRole}
        onClose={() => {
          setShowUserDetailDialog(false);
          setEditingUser(false);
        }}
        onEdit={() => {
          if (selectedUser) {
            setEditUserRole(selectedUser.role);
            setEditingUser(true);
          }
        }}
        onSave={() => {
          setEditingUser(false);
          setTimeout(() => showToast(t.toast.userUpdated, t.common.saving), 200);
        }}
        onCancelEdit={() => setEditingUser(false)}
      />

      <AddUserModal
        isOpen={showInviteUserDialog}
        email={inviteEmail}
        username={newUserName}
        password={newUserPassword}
        role={newUserRole}
        onEmailChange={setInviteEmail}
        onUsernameChange={setNewUserName}
        onPasswordChange={setNewUserPassword}
        onRoleChange={setNewUserRole}
        onClose={() => {
          setShowInviteUserDialog(false);
          setInviteEmail('');
          setNewUserName('');
          setNewUserPassword('');
          setNewUserRole('user');
        }}
        onSubmit={() => {
          setShowInviteUserDialog(false);
          setTimeout(() => showToast(t.toast.userAdded, t.toast.addingUser), 200);
          setInviteEmail('');
          setNewUserName('');
          setNewUserPassword('');
          setNewUserRole('user');
        }}
      />

      <CustomToast
        visible={toast.visible}
        message={toast.message}
        loading={toast.loading}
        closing={toast.closing}
      />
    </>
  );
}
