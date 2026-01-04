/**
 * 用户管理页面组件
 * 使用真实 API 数据
 */

'use client';

import { useState } from 'react';
import { User, Shield, Crown, Github, MailCheck, Fingerprint, ArrowUpRight, Search } from 'lucide-react';
import { PageHeader } from '../shared';
import { GoogleIcon } from '../icons';
import { Tooltip } from '@/components/ui/Tooltip';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '../../i18n';
import { useToast } from '@/components/ui/Toast';
import { useUsers } from '../../hooks';
import type { User as ApiUser, UserRole } from '@/services/admin';

export function UserTab() {
  const { t } = useI18n();
  const { toast } = useToast();

  const {
    users,
    totalUsers,
    totalPages,
    currentPage,
    availableRoles,
    selectedUsers,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    isLoading,
    isUpdating,
    updateUser,
    removeUser,
    batchOperate,
    toggleSelectUser,
    selectAllUsers,
    clearSelection,
    goToPage,
  } = useUsers();

  // 弹窗状态
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // 编辑表单
  const [editForm, setEditForm] = useState({
    email: '',
    username: '',
    role: 'user' as UserRole,
    verified: false,
  });

  // 获取角色显示名称
  const getRoleName = (role: string) => {
    const found = availableRoles.find(r => r.value === role);
    if (found) return found.label;
    const roleKey = role as keyof typeof t.users.roles;
    return t.users.roles[roleKey] || role.replace('_', ' ');
  };

  // 打开用户详情
  const handleUserClick = (user: ApiUser) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      username: user.username || '',
      role: user.role,
      verified: user.verified,
    });
    setIsEditing(false);
  };

  // 保存用户
  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      const updates: any = {};
      if (editForm.email !== selectedUser.email) updates.email = editForm.email;
      if (editForm.username !== (selectedUser.username || '')) updates.username = editForm.username || undefined;
      if (editForm.verified !== selectedUser.verified) updates.verified = editForm.verified;
      if (editForm.role !== selectedUser.role) updates.role = editForm.role;

      await updateUser(selectedUser.id, updates);
      toast(t.toast.userUpdated);
      setSelectedUser(null);
      setIsEditing(false);
    } catch (err: any) {
      toast(err.message || '更新失败');
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    try {
      await removeUser(userId);
      toast('用户已删除');
      setShowDeleteConfirm(null);
      setSelectedUser(null);
    } catch (err: any) {
      toast(err.message || '删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      const result = await batchOperate('delete');
      toast(`已删除 ${result.success} 个用户`);
      setShowBatchDeleteConfirm(false);
    } catch (err: any) {
      toast(err.message || '批量删除失败');
    }
  };

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.description} />

      <div className="p-4 md:py-6 lg:px-0 space-y-6">
        {/* 工具栏 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={t.users.searchUsers}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-lg border border-muted bg-transparent pl-10 pr-4 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={roleFilter}
              onChange={(val) => setRoleFilter(val as UserRole | '')}
              options={[
                { value: '', label: '所有角色' },
                ...availableRoles.map((role) => ({ value: role.value, label: role.label }))
              ]}
              placeholder="所有角色"
              className="w-36"
            />
          </div>
        </div>

        {/* 批量操作条 */}
        {selectedUsers.size > 0 && (
          <div className="rounded-xl border border-muted bg-surface-l1 px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-muted">
              已选择 <span className="text-regular font-medium">{selectedUsers.size}</span> 个用户
            </span>
            <div className="flex gap-2">
              <button
                onClick={clearSelection}
                className="cursor-pointer px-3 py-1 text-sm rounded-full border border-muted hover:bg-overlay-hover"
              >
                取消选择
              </button>
              <button
                onClick={() => setShowBatchDeleteConfirm(true)}
                className="cursor-pointer px-3 py-1 text-sm rounded-full text-red-500 hover:bg-red-500/10"
              >
                批量删除
              </button>
            </div>
          </div>
        )}

        {/* 用户表格 */}
        <div className="overflow-clip rounded-xl border bg-surface-l1">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors">
                  <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={(e) => e.target.checked ? selectAllUsers() : clearSelection()}
                      className="h-4 w-4 rounded border-muted"
                    />
                  </th>
                  <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5">
                    {t.users.email}
                  </th>
                  <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5">
                    {t.users.name}
                  </th>
                  <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5">
                    {t.users.role}
                  </th>
                  <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5">
                    {t.users.status}
                  </th>
                  <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-12" />
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  // 骨架屏
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-3 sm:px-5"><div className="h-4 w-4 rounded bg-muted/30 animate-pulse" /></td>
                      <td className="px-2 py-3 sm:px-5"><div className="h-4 w-40 rounded bg-muted/30 animate-pulse" /></td>
                      <td className="px-2 py-3 sm:px-5"><div className="h-4 w-24 rounded bg-muted/30 animate-pulse" /></td>
                      <td className="px-2 py-3 sm:px-5"><div className="h-4 w-20 rounded bg-muted/30 animate-pulse" /></td>
                      <td className="px-2 py-3 sm:px-5"><div className="h-4 w-16 rounded bg-muted/30 animate-pulse" /></td>
                      <td className="px-2 py-3 sm:px-5" />
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted">
                      没有找到用户
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b transition-colors hover:bg-overlay-hover group cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="px-2 py-2 align-middle sm:px-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="h-4 w-4 rounded border-muted cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="truncate">{user.email}</div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          {user.githubLinked && <Github className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          {user.googleLinked && <GoogleIcon className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          <p className="text-sm text-muted truncate">{user.username || '-'}</p>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          {user.role === 'super_admin' && <Crown className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          {user.role === 'admin' && <Shield className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          {user.role === 'user' && <User className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                          <span className="text-sm truncate">{getRoleName(user.role)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          {user.verified && (
                            <Tooltip content={t.users.emailVerified}>
                              <MailCheck className="h-4 w-4" />
                            </Tooltip>
                          )}
                          {user.totpEnabled && (
                            <Tooltip content={t.users.twoFactorEnabled}>
                              <Shield className="h-4 w-4" />
                            </Tooltip>
                          )}
                          {user.biometricEnabled && (
                            <Tooltip content={t.users.biometricEnabled}>
                              <Fingerprint className="h-4 w-4" />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle sm:px-5">
                        <button className="cursor-pointer opacity-0 group-hover:opacity-100 text-subtle hover:text-primary transition-all">
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-muted px-5 py-3 text-sm">
              <span className="text-muted">
                共 {totalUsers} 个用户，第 {currentPage}/{totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="cursor-pointer px-3 py-1 text-sm rounded-full border border-muted hover:bg-overlay-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="cursor-pointer px-3 py-1 text-sm rounded-full border border-muted hover:bg-overlay-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 用户详情/编辑弹窗 */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null);
          setIsEditing(false);
        }}
        title={isEditing ? '编辑用户' : (selectedUser?.username || selectedUser?.email || '用户详情')}
        size="md"
      >
        {selectedUser && (
          <div className="space-y-5">
            {isEditing ? (
              // 编辑模式
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">邮箱</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">用户名</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder="可选"
                    className="flex h-10 w-full border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">角色</label>
                  <Select
                    value={editForm.role}
                    onChange={(val) => setEditForm({ ...editForm, role: val as UserRole })}
                    options={availableRoles.map((role) => ({ value: role.value, label: role.label }))}
                    placeholder="选择角色"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={editForm.verified}
                    onChange={(e) => setEditForm({ ...editForm, verified: e.target.checked })}
                    className="h-4 w-4 rounded border-muted cursor-pointer"
                  />
                  <label htmlFor="verified" className="text-sm cursor-pointer">邮箱已验证</label>
                </div>
              </div>
            ) : (
              // 查看模式
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">邮箱</span>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">用户名</span>
                  <span>{selectedUser.username || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">角色</span>
                  <span>{getRoleName(selectedUser.role)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">邮箱验证</span>
                  <span>{selectedUser.verified ? '已验证' : '未验证'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">2FA</span>
                  <span>{selectedUser.totpEnabled ? '已启用' : '未启用'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">创建时间</span>
                  <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleSaveUser}
                    disabled={isUpdating}
                    className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? t.common.processing : t.common.save}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
                  >
                    {t.common.edit}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedUser.id)}
                    className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    {t.common.delete}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="确认删除用户"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted">
            确定要删除这个用户吗？此操作无法撤销，用户的所有数据将被永久删除。
          </p>
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={() => showDeleteConfirm && handleDeleteUser(showDeleteConfirm)}
              disabled={isUpdating}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isUpdating ? t.common.processing : t.common.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* 批量删除确认弹窗 */}
      <Modal
        isOpen={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        title={`确认删除 ${selectedUsers.size} 个用户`}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted">
            确定要删除选中的 {selectedUsers.size} 个用户吗？此操作无法撤销。
          </p>
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setShowBatchDeleteConfirm(false)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent hover:bg-overlay-hover transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={isUpdating}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isUpdating ? t.common.processing : '确认删除'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
