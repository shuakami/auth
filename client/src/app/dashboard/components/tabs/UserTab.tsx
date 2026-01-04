/**
 * 用户管理页面组件
 * 使用真实 API 数据，参考 OAuthTab 结构
 */

'use client';

import { useState } from 'react';
import { User, Shield, Crown, Github, MailCheck, Fingerprint, Settings } from 'lucide-react';
import { PageHeader, DataCard } from '../shared';
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
    searchQuery,
    setSearchQuery,
    isLoading,
    isUpdating,
    updateUser,
    removeUser,
    goToPage,
  } = useUsers();

  // 弹窗状态
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.description} />

      <div className="p-4 md:py-6 lg:px-0">
        <DataCard
          title={t.users.allUsers}
          description={`共 ${totalUsers} 个用户`}
          searchPlaceholder={t.users.searchUsers}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <div className="w-full">
            <div className="flow-root">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors">
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[30%]">
                      {t.users.email}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[25%]">
                      {t.users.name}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[20%]">
                      {t.users.role}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[15%]">
                      {t.users.status}
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[10%]" />
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-3 sm:px-5"><div className="h-4 w-40 rounded bg-muted/30 animate-pulse" /></td>
                        <td className="px-2 py-3 sm:px-5"><div className="h-4 w-24 rounded bg-muted/30 animate-pulse" /></td>
                        <td className="px-2 py-3 sm:px-5"><div className="h-4 w-20 rounded bg-muted/30 animate-pulse" /></td>
                        <td className="px-2 py-3 sm:px-5"><div className="h-4 w-16 rounded bg-muted/30 animate-pulse" /></td>
                        <td className="px-2 py-3 sm:px-5" />
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted">
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
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <div className="flex items-center gap-2">
                            {user.githubLinked && <Github className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                            {user.googleLinked && <GoogleIcon className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                            <span className="text-muted truncate">{user.username || '-'}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <div className="flex items-center gap-2">
                            {user.role === 'super_admin' && <Crown className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                            {user.role === 'admin' && <Shield className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                            {user.role === 'user' && <User className="h-3.5 w-3.5 text-subtle flex-shrink-0" />}
                            <span className="text-sm truncate">{getRoleName(user.role)}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-5">
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
                        <td className="px-2 py-3 align-middle sm:px-5">
                          <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="cursor-pointer text-subtle hover:text-primary transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserClick(user);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
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
                  第 {currentPage}/{totalPages} 页
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
        </DataCard>
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
    </>
  );
}
