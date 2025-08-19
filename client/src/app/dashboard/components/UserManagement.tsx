'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { Section, Button, Input } from '../DashboardUI';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
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
    case 'TOGGLE_SELECT':
      if (!action.userId) return state;
      const newSelected = new Set(state.selectedUsers);
      if (newSelected.has(action.userId)) {
        newSelected.delete(action.userId);
      } else {
        newSelected.add(action.userId);
      }
      return { ...state, selectedUsers: newSelected };

    case 'SELECT_ALL':
      const allIds = new Set(state.users.map(u => u.id));
      return { ...state, selectedUsers: allIds };

    case 'CLEAR_SELECTION':
      return { ...state, selectedUsers: new Set() };

    default:
      return { ...state, ...action };
  }
}

export default function UserManagement() {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 显示消息
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

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
        error: error.response?.data?.error || '加载用户列表失败',
      });
    }
  }, [state.currentPage, state.sortBy, state.sortOrder, state.searchQuery, state.roleFilter, state.verifiedFilter]);

  // 加载可用角色
  const loadRoles = useCallback(async () => {
    try {
      const roles = await getAvailableRoles();
      dispatch({ availableRoles: roles });
    } catch (error) {
      console.error('加载角色失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  // 搜索处理
  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    dispatch({ currentPage: 1 });
    loadUsers();
  }, [loadUsers]);

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
  const handleSaveUser = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!state.editingUser) return;

    try {
      const originalUser = state.users.find(u => u.id === state.editingUser!.id);
      if (!originalUser) return;

      // 检查哪些字段发生了变化
      const updates: any = {};
      if (state.editingUser.email !== originalUser.email) {
        updates.email = state.editingUser.email;
      }
      if (state.editingUser.username !== (originalUser.username || '')) {
        updates.username = state.editingUser.username || null;
      }
      if (state.editingUser.verified !== originalUser.verified) {
        updates.verified = state.editingUser.verified;
      }

      // 更新基本信息
      if (Object.keys(updates).length > 0) {
        await updateUserInfo(state.editingUser.id, updates);
      }

      // 更新角色
      if (state.editingUser.role !== originalUser.role) {
        await updateUserRole(state.editingUser.id, state.editingUser.role);
      }

      showMessage('success', '用户信息更新成功');
      dispatch({ editingUser: null });
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || '更新失败');
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
      showMessage('error', error.response?.data?.error || '删除失败');
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
      showMessage('error', error.response?.data?.error || '批量操作失败');
    }
  }, [state.selectedUsers, showMessage, loadUsers]);

  // 角色标签样式
  const getRoleLabel = useCallback((role: UserRole) => {
    const styles = {
      user: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      super_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    const labels = {
      user: '用户',
      admin: '管理员',
      super_admin: '超级管理员',
    };
    return { style: styles[role], label: labels[role] };
  }, []);

  // 渲染用户表格
  const renderUserTable = useMemo(() => {
    if (state.loading) {
      return <LoadingIndicator />;
    }

    if (state.error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200">
          {state.error}
        </div>
      );
    }

    if (state.users.length === 0) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          没有找到用户
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700">
        <table className="w-full divide-y divide-neutral-200 dark:divide-zinc-700">
          <thead className="bg-neutral-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={state.selectedUsers.size === state.users.length && state.users.length > 0}
                  onChange={(e) => dispatch({ type: e.target.checked ? 'SELECT_ALL' : 'CLEAR_SELECTION' })}
                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-400">
                用户信息
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-400">
                角色
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-400">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-400">
                创建时间
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-400">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
            {state.users.map((user) => {
              const roleInfo = getRoleLabel(user.role);
              return (
                <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={state.selectedUsers.has(user.id)}
                      onChange={() => dispatch({ type: 'TOGGLE_SELECT', userId: user.id })}
                      className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-700"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-zinc-100">
                        {user.username || '未设置'}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-zinc-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleInfo.style}`}>
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        user.verified
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {user.verified ? '已验证' : '未验证'}
                      </span>
                      {user.totpEnabled && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          2FA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-500 dark:text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-4 text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditUser(user)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => dispatch({ showDeleteConfirm: user.id })}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [state.users, state.loading, state.error, state.selectedUsers, getRoleLabel, handleEditUser]);

  // 渲染分页
  const renderPagination = useMemo(() => {
    if (state.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-500 dark:text-zinc-400">
          共 {state.totalUsers} 个用户，第 {state.currentPage} / {state.totalPages} 页
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={state.currentPage <= 1}
            onClick={() => dispatch({ currentPage: state.currentPage - 1 })}
          >
            上一页
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={state.currentPage >= state.totalPages}
            onClick={() => dispatch({ currentPage: state.currentPage + 1 })}
          >
            下一页
          </Button>
        </div>
      </div>
    );
  }, [state.currentPage, state.totalPages, state.totalUsers]);

  return (
    <div className="space-y-6">
      <Section title="用户管理">
        <p className="text-sm text-neutral-500 dark:text-zinc-400">
          管理系统用户，控制角色权限和账户状态
        </p>

        {/* 消息提示 */}
        {message && (
          <div className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-200'
              : 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={state.searchQuery}
                onChange={(e) => dispatch({ searchQuery: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={state.loading}>
              搜索
            </Button>
          </form>

          <div className="flex gap-4">
            <select
              value={state.roleFilter}
              onChange={(e) => dispatch({ roleFilter: e.target.value as UserRole | '' })}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="">所有角色</option>
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
              <option value="super_admin">超级管理员</option>
            </select>

            <select
              value={state.verifiedFilter.toString()}
              onChange={(e) => dispatch({ verifiedFilter: e.target.value === '' ? '' : e.target.value === 'true' })}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="">所有状态</option>
              <option value="true">已验证</option>
              <option value="false">未验证</option>
            </select>
          </div>
        </div>

        {/* 批量操作 */}
        {state.selectedUsers.size > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-zinc-400">
                已选择 {state.selectedUsers.size} 个用户
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBatchOperation('verify')}
                >
                  批量验证
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBatchOperation('unverify')}
                >
                  取消验证
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleBatchOperation('delete')}
                >
                  批量删除
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 用户表格 */}
        {renderUserTable}

        {/* 分页 */}
        {renderPagination}
      </Section>

      {/* 编辑用户模态框 */}
      {state.editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-zinc-100">
              编辑用户
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  邮箱
                </label>
                <Input
                  type="email"
                  value={state.editingUser.email}
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, email: e.target.value }
                  })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  用户名
                </label>
                <Input
                  type="text"
                  value={state.editingUser.username}
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, username: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  角色
                </label>
                <select
                  value={state.editingUser.role}
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, role: e.target.value as UserRole }
                  })}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                >
                  {state.availableRoles.map(role => (
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
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, verified: e.target.checked }
                  })}
                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <label htmlFor="verified" className="ml-2 text-sm text-neutral-700 dark:text-zinc-300">
                  邮箱已验证
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => dispatch({ editingUser: null })}
                >
                  取消
                </Button>
                <Button type="submit">
                  保存
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {state.showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-zinc-100">
              确认删除
            </h3>
            <p className="mb-4 text-sm text-neutral-600 dark:text-zinc-400">
              确定要删除这个用户吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => dispatch({ showDeleteConfirm: null })}
              >
                取消
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteUser(state.showDeleteConfirm!)}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}