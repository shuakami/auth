'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type FormEvent,
} from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  Search,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  Users,
  Mail,
  MailCheck,
  Github,
  Chrome,
  ShieldOff,
  MailX,
  Fingerprint,
} from 'lucide-react';
import {
  getUsersList,
  updateUserRole,
  updateUserInfo,
  deleteUser,
  getAvailableRoles,
  batchOperateUsers,
  type User,
  type UserRole,
  type RoleOption,
} from '@/services/admin';

// 动态导入 ConfirmModal
const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), { ssr: false });

// 用户编辑表单状态
interface UserEditForm {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  verified: boolean;
}

// 组件状态
interface UserManagementState {
  users: User[];
  loading: boolean;
  error: string;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  selectedUsers: Set<string>;
  editingUser: UserEditForm | null;
  showDeleteConfirm: string | null;
  showBatchDeleteConfirm: boolean;
  availableRoles: RoleOption[];
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  roleFilter: UserRole | '';
  verifiedFilter: boolean | '';
}

const initialState: UserManagementState = {
  users: [],
  loading: true,
  error: '',
  searchQuery: '',
  currentPage: 1,
  totalPages: 1,
  totalUsers: 0,
  selectedUsers: new Set(),
  editingUser: null,
  showDeleteConfirm: null,
  showBatchDeleteConfirm: false,
  availableRoles: [],
  sortBy: 'created_at',
  sortOrder: 'DESC',
  roleFilter: '',
  verifiedFilter: '',
};

type StateAction = Partial<UserManagementState> & {
  type?: 'TOGGLE_SELECT' | 'SELECT_ALL' | 'CLEAR_SELECTION';
  userId?: string;
};

function stateReducer(state: UserManagementState, action: StateAction): UserManagementState {
  switch (action.type) {
    case 'TOGGLE_SELECT': {
      if (!action.userId) return state;
      const newSelected = new Set(state.selectedUsers);
      if (newSelected.has(action.userId)) newSelected.delete(action.userId);
      else newSelected.add(action.userId);
      return { ...state, selectedUsers: newSelected };
    }
    case 'SELECT_ALL': {
      const allIds = new Set(state.users.map(u => u.id));
      return { ...state, selectedUsers: allIds };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedUsers: new Set() };
    default:
      return { ...state, ...action };
  }
}

export default function UserManagement() {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');

  // 显示消息
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // 搜索值防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputValue !== state.searchQuery) {
        dispatch({ searchQuery: searchInputValue, currentPage: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInputValue, state.searchQuery]);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    dispatch({ loading: true, error: '' });
    try {
      const params = {
        page: state.currentPage,
        limit: 20,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        ...(state.searchQuery && { search: state.searchQuery }),
        ...(state.roleFilter && { role: state.roleFilter }),
        ...(state.verifiedFilter !== '' && { verified: state.verifiedFilter }),
      };

      const result = await getUsersList(params);
      dispatch({
        users: result.users,
        totalPages: result.pagination.totalPages,
        totalUsers: result.pagination.total,
        loading: false,
      });
    } catch (error: any) {
      dispatch({
        loading: false,
        error: error?.response?.data?.error || '加载用户列表失败',
      });
    }
  }, [state.currentPage, state.sortBy, state.sortOrder, state.searchQuery, state.roleFilter, state.verifiedFilter]);

  // 加载可用角色
  const loadRoles = useCallback(async () => {
    try {
      const roles = await getAvailableRoles();
      dispatch({ availableRoles: roles });
    } catch (error) {
      // 静默失败
    }
  }, []);

  // 初始化与依赖变化
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  // 编辑用户
  const handleEditUser = useCallback((user: User) => {
    dispatch({
      editingUser: {
        id: user.id,
        email: user.email,
        username: user.username || '',
        role: user.role,
        verified: user.verified,
      },
    });
  }, []);

  // 保存用户编辑
  const handleSaveUser = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!state.editingUser) return;

    try {
      const originalUser = state.users.find(u => u.id === state.editingUser!.id);
      if (!originalUser) return;

      const updates: any = {};
      if (state.editingUser.email !== originalUser.email) updates.email = state.editingUser.email;
      if (state.editingUser.username !== (originalUser.username || '')) updates.username = state.editingUser.username || null;
      if (state.editingUser.verified !== originalUser.verified) updates.verified = state.editingUser.verified;

      if (Object.keys(updates).length > 0) await updateUserInfo(state.editingUser.id, updates);
      if (state.editingUser.role !== originalUser.role) await updateUserRole(state.editingUser.id, state.editingUser.role);

      showMessage('success', '用户信息更新成功');
      dispatch({ editingUser: null });
      loadUsers();
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || '更新失败');
    }
  }, [state.editingUser, state.users, showMessage, loadUsers]);

  // 删除用户
  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUser(userId);
      showMessage('success', '用户删除成功');
      dispatch({ showDeleteConfirm: null });
      loadUsers();
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || '删除失败');
    }
  }, [showMessage, loadUsers]);

  // 批量操作
  const handleBatchOperation = useCallback(async (action: string, data?: any) => {
    if (state.selectedUsers.size === 0) {
      showMessage('error', '请先选择用户');
      return;
    }
    try {
      const userIds = Array.from(state.selectedUsers);
      const result = await batchOperateUsers(action, userIds, data);

      if (result.errors.length > 0) {
        showMessage('error', `操作完成，但有 ${result.errors.length} 个用户操作失败`);
      } else {
        showMessage('success', `批量操作成功，共处理 ${result.summary.success} 个用户`);
      }

      dispatch({ type: 'CLEAR_SELECTION' });
      loadUsers();
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || '批量操作失败');
    }
  }, [state.selectedUsers, showMessage, loadUsers]);

  // 角色标签配置
  const getRoleConfig = useCallback((role: UserRole) => {
    const configs = {
      user: { icon: <Users className="w-4 h-4 text-neutral-500" />, label: '用户' },
      admin: { icon: <Shield className="w-4 h-4 text-neutral-500" />, label: '管理员' },
      super_admin: { icon: <Crown className="w-4 h-4 text-neutral-500" />, label: '超级管理员' },
    };
    return configs[role];
  }, []);

  // 骨架屏
  const UserTableSkeleton = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full table-fixed divide-y divide-black/5 dark:divide-white/10">
        <thead className="bg-neutral-50 dark:bg-zinc-800/60">
          <tr>
            {[...Array(6)].map((_, i) => (
              <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/10">
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              {[...Array(6)].map((__, j) => (
                <td key={j} className="px-6 py-4">
                  <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 用户表格
  const renderUserTable = useMemo(() => {
    if (state.loading) return <UserTableSkeleton />;

    if (state.error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-zinc-500">
              <Users className="h-full w-full" />
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          </div>
        </div>
      );
    }

    if (state.users.length === 0) {
      return (
        <div className="flex items-center justify-center p-10">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-neutral-400 dark:text-zinc-500">
              <Users className="h-full w-full" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-zinc-400">没有找到用户</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-black/5 dark:divide-white/10">
          <colgroup>
            <col className="w-14" />
            <col />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-40" />
          </colgroup>

          <thead className="bg-neutral-50 dark:bg-zinc-800/60">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={state.selectedUsers.size === state.users.length && state.users.length > 0}
                  onChange={(e) => dispatch({ type: e.target.checked ? 'SELECT_ALL' : 'CLEAR_SELECTION' })}
                  className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">用户信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">操作</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {state.users.map((user) => {
              const roleConfig = getRoleConfig(user.role);
              return (
                <tr key={user.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]">
                  <td className="px-6 py-3.5">
                    <input
                      type="checkbox"
                      checked={state.selectedUsers.has(user.id)}
                      onChange={() => dispatch({ type: 'TOGGLE_SELECT', userId: user.id })}
                      className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                    />
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex w-10 flex-shrink-0 items-center space-x-1.5 text-neutral-400 dark:text-zinc-500">
                        {user.githubLinked && <Github className="h-4 w-4" />}
                        {user.googleLinked && <Chrome className="h-4 w-4" />}
                      </div>
                      <div className="truncate">
                        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {user.username || '未设置用户名'}
                        </div>
                        <div className="truncate text-sm text-neutral-500 dark:text-zinc-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {roleConfig.icon}
                      <span className="text-sm font-medium text-neutral-800 dark:text-zinc-200">{roleConfig.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-4">
                      <span title={user.verified ? '邮箱已验证' : '邮箱未验证'}>
                        {user.verified ? (
                          <MailCheck className="h-4 w-4 text-neutral-700 dark:text-zinc-300" />
                        ) : (
                          <MailX className="h-4 w-4 text-neutral-400 dark:text-zinc-500" />
                        )}
                      </span>
                      <span title={user.totpEnabled ? '2FA 已启用' : '2FA 未启用'}>
                        {user.totpEnabled ? (
                          <ShieldCheck className="h-4 w-4 text-neutral-700 dark:text-zinc-300" />
                        ) : (
                          <ShieldOff className="h-4 w-4 text-neutral-400 dark:text-zinc-500" />
                        )}
                      </span>
                      <span title={user.biometricEnabled ? '生物验证已启用' : '生物验证未启用'}>
                        <Fingerprint className={`h-4 w-4 ${user.biometricEnabled ? 'text-neutral-700 dark:text-zinc-300' : 'text-neutral-400 dark:text-zinc-500'}`} />
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm text-neutral-600 dark:text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} className="h-8 px-3">
                        <Edit className="mr-1.5 h-4 w-4" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dispatch({ showDeleteConfirm: user.id })}
                        className="h-8 px-3 text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 分页 */}
        {state.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-black/5 px-6 py-4 text-sm dark:border-white/10">
            <div className="text-neutral-600 dark:text-zinc-400">
              共 <span className="font-medium text-neutral-900 dark:text-neutral-100">{state.totalUsers}</span> 个用户，
              第 <span className="font-medium text-neutral-900 dark:text-neutral-100">{state.currentPage}</span> /
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{state.totalPages}</span> 页
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={state.currentPage <= 1}
                onClick={() => dispatch({ currentPage: state.currentPage - 1 })}
                className="h-8"
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={state.currentPage >= state.totalPages}
                onClick={() => dispatch({ currentPage: state.currentPage + 1 })}
                className="h-8"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }, [state.users, state.loading, state.error, state.selectedUsers, state.totalUsers, state.currentPage, state.totalPages, getRoleConfig, handleEditUser]);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">用户管理</h3>
        <p className="text-sm text-neutral-600 dark:text-zinc-400">管理系统用户，控制角色权限和账户状态</p>
      </div>

      {/* 消息 */}
      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-300/50 bg-emerald-50/60 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'border-red-300/50 bg-red-50/60 text-red-700 dark:border-red-600/40 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="通过用户名或邮箱搜索…"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-white pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-neutral-400/40 dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 dark:placeholder-zinc-500 dark:focus:ring-neutral-500/40 md:max-w-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={state.roleFilter}
            onChange={(e) => dispatch({ roleFilter: e.target.value as UserRole | '', currentPage: 1 })}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
          >
            <option value="">所有角色</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
            <option value="super_admin">超级管理员</option>
          </select>

          <select
            value={state.verifiedFilter.toString()}
            onChange={(e) => dispatch({ verifiedFilter: e.target.value === '' ? '' : e.target.value === 'true', currentPage: 1 })}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
          >
            <option value="">所有状态</option>
            <option value="true">已验证</option>
            <option value="false">未验证</option>
          </select>
        </div>
      </div>

      {/* 批量操作条 */}
      {state.selectedUsers.size > 0 && (
        <div className="rounded-md border border-black/10 bg-black/[0.02] px-6 py-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-zinc-400">
              已选择 <span className="font-medium text-neutral-900 dark:text-neutral-100">{state.selectedUsers.size}</span> 个用户
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBatchOperation('verify')} className="h-8">
                <MailCheck className="mr-1 h-4 w-4" />
                批量验证
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBatchOperation('unverify')} className="h-8">
                <Mail className="mr-1 h-4 w-4" />
                取消验证
              </Button>
              <Button size="sm" variant="error" onClick={() => dispatch({ showBatchDeleteConfirm: true })} className="h-8">
                <Trash2 className="mr-1 h-4 w-4" />
                批量删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 用户表格 */}
      {renderUserTable}

      {/* 编辑用户模态框 */}
      <ConfirmModal
        isOpen={!!state.editingUser}
        onClose={() => dispatch({ editingUser: null })}
        onConfirm={handleSaveUser}
        title="编辑用户信息"
        message={
          state.editingUser && (
            <form className="space-y-4" onSubmit={handleSaveUser}>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">邮箱地址</label>
                <input
                  type="email"
                  value={state.editingUser.email}
                  onChange={(e) => dispatch({ editingUser: { ...state.editingUser!, email: e.target.value } })}
                  required
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">用户名</label>
                <input
                  type="text"
                  value={state.editingUser.username}
                  onChange={(e) => dispatch({ editingUser: { ...state.editingUser!, username: e.target.value } })}
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">用户角色</label>
                <select
                  value={state.editingUser.role}
                  onChange={(e) => dispatch({ editingUser: { ...state.editingUser!, role: e.target.value as UserRole } })}
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400/40 dark:focus:ring-neutral-500/40"
                >
                  {state.availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="verified"
                  checked={state.editingUser.verified}
                  onChange={(e) => dispatch({ editingUser: { ...state.editingUser!, verified: e.target.checked } })}
                  className="h-4 w-4 rounded border-neutral-300 bg-neutral-100 text-black focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-neutral-600"
                />
                <label htmlFor="verified" className="ml-2 text-sm text-neutral-700 dark:text-zinc-300">
                  邮箱已验证
                </label>
              </div>
            </form>
          )
        }
        type="default"
        confirmText="保存更改"
        cancelText="取消"
      />

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={!!state.showDeleteConfirm}
        onClose={() => dispatch({ showDeleteConfirm: null })}
        onConfirm={() => { if (state.showDeleteConfirm) handleDeleteUser(state.showDeleteConfirm); }}
        title="确认删除用户"
        message={
          <div className="space-y-3 text-sm">
            <p className="text-neutral-600 dark:text-zinc-400">您确定要删除这个用户吗？此操作将会：</p>
            <ul className="list-inside list-disc space-y-1 text-neutral-600 dark:text-zinc-400">
              <li>永久删除用户账户</li>
              <li>清除所有相关数据</li>
              <li>用户将无法再次登录</li>
            </ul>
            <p className="font-medium text-red-600 dark:text-red-400">此操作无法撤销，请谨慎操作。</p>
          </div>
        }
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />

      {/* 批量删除确认模态框 */}
      <ConfirmModal
        isOpen={state.showBatchDeleteConfirm}
        onClose={() => dispatch({ showBatchDeleteConfirm: false })}
        onConfirm={() => {
          handleBatchOperation('delete');
          dispatch({ showBatchDeleteConfirm: false });
        }}
        title={`确认批量删除 ${state.selectedUsers.size} 个用户`}
        message={
          <div className="space-y-3 text-sm">
            <p className="text-neutral-600 dark:text-zinc-400">
              您确定要删除选中的 <strong>{state.selectedUsers.size}</strong> 个用户吗？此操作将会：
            </p>
            <ul className="list-inside list-disc space-y-1 text-neutral-600 dark:text-zinc-400">
              <li>永久删除这些用户账户</li>
              <li>清除所有相关数据</li>
              <li>这些用户将无法再次登录</li>
            </ul>
            <p className="font-medium text-red-600 dark:text-red-400">此操作无法撤销，请谨慎操作。</p>
          </div>
        }
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}
