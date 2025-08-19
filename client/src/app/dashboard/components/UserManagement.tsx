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
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { 
  Search,
  Filter,
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
  const handleSaveUser = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
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

  // 角色标签样式 - a more minimal approach
  const getRoleConfig = useCallback((role: UserRole) => {
    const configs = {
      user: {
        icon: <Users className="w-4 h-4 text-neutral-500" />,
        label: '用户',
      },
      admin: {
        icon: <Shield className="w-4 h-4 text-neutral-500" />,
        label: '管理员',
      },
      super_admin: {
        icon: <Crown className="w-4 h-4 text-neutral-500" />,
        label: '超级管理员',
      },
    };
    return configs[role];
  }, []);

  // 骨架屏组件
  const UserTableSkeleton = () => (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-zinc-700 table-fixed">
          <colgroup>
            <col className="w-14" />
            <col />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-32" />
          </colgroup>
          <thead className="bg-neutral-50 dark:bg-zinc-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                <div className="w-4 h-4 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">用户信息</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">角色</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">状态</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">创建时间</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-3.5">
                  <div className="w-4 h-4 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-3 w-48 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse"></div>
                    <div className="h-4 w-12 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse"></div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-zinc-700 animate-pulse"></div>
                    <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-zinc-700 animate-pulse"></div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="h-4 w-24 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <div className="flex justify-end gap-2">
                    <div className="h-8 w-16 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 渲染用户表格
  const renderUserTable = useMemo(() => {
    if (state.loading) {
      return <UserTableSkeleton />;
    }

    if (state.error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-neutral-400 dark:text-zinc-500 mb-4">
              <Users className="w-full h-full" />
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          </div>
        </div>
      );
    }

    if (state.users.length === 0) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-neutral-400 dark:text-zinc-500 mb-4">
              <Users className="w-full h-full" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-zinc-400">没有找到用户</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-zinc-700 table-fixed">
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-32" />
            </colgroup>
            <thead className="bg-neutral-50 dark:bg-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={state.selectedUsers.size === state.users.length && state.users.length > 0}
                    onChange={(e) => dispatch({ type: e.target.checked ? 'SELECT_ALL' : 'CLEAR_SELECTION' })}
                    className="w-4 h-4 text-black bg-neutral-100 border-neutral-300 rounded focus:ring-neutral-500 dark:focus:ring-neutral-600 dark:ring-offset-gray-800 dark:bg-neutral-700 dark:border-neutral-600"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">用户信息</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">角色</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">状态</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">创建时间</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-700">
              {state.users.map((user) => {
                const roleConfig = getRoleConfig(user.role);
                return (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <input
                        type="checkbox"
                        checked={state.selectedUsers.has(user.id)}
                        onChange={() => dispatch({ type: 'TOGGLE_SELECT', userId: user.id })}
                        className="w-4 h-4 text-black bg-neutral-100 border-neutral-300 rounded focus:ring-neutral-500 dark:focus:ring-neutral-600 dark:ring-offset-gray-800 dark:bg-neutral-700 dark:border-neutral-600"
                      />
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 flex items-center space-x-1.5 text-neutral-400 dark:text-zinc-500">
                          {user.githubLinked && <Github className="w-4 h-4" />}
                          {user.googleLinked && <Chrome className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {user.username || '未设置用户名'}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-zinc-400 truncate">{user.email}</div>
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
                            <MailCheck className="w-4 h-4 text-neutral-700 dark:text-zinc-300" />
                          ) : (
                            <MailX className="w-4 h-4 text-neutral-400 dark:text-zinc-500" />
                          )}
                        </span>
                        <span title={user.totpEnabled ? '2FA 已启用' : '2FA 未启用'}>
                          {user.totpEnabled ? (
                            <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-zinc-300" />
                          ) : (
                            <ShieldOff className="w-4 h-4 text-neutral-400 dark:text-zinc-500" />
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-neutral-600 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditUser(user)}
                          className="h-8 px-3"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dispatch({ showDeleteConfirm: user.id })}
                          className="h-8 px-3 text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
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
        {/* 分页集成到表格底部 */}
        {state.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 dark:bg-zinc-800/50 border-t border-neutral-200 dark:border-zinc-700">
            <div className="text-sm text-neutral-600 dark:text-zinc-400">
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
  }, [state.users, state.loading, state.error, state.selectedUsers, getRoleConfig, handleEditUser]);



  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          用户管理
        </h3>
        <p className="text-sm text-neutral-600 dark:text-zinc-400">
          管理系统用户，控制角色权限和账户状态
        </p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-zinc-700">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">搜索与筛选</h4>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={state.searchQuery}
                onChange={(e) => dispatch({ searchQuery: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-950 dark:border-zinc-600 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
              />
            </div>
            <Button 
              type="submit" 
              disabled={state.loading}
              size="sm"
              className="px-4"
            >
              <Search className="w-4 h-4 mr-2" />
              搜索
            </Button>
          </form>

          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-zinc-500 w-4 h-4" />
              <select
                value={state.roleFilter}
                onChange={(e) => dispatch({ roleFilter: e.target.value as UserRole | '' })}
                className="pl-10 pr-8 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-950 dark:border-zinc-600 dark:text-neutral-100 appearance-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
              >
                <option value="">所有角色</option>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </div>

            <select
              value={state.verifiedFilter.toString()}
              onChange={(e) => dispatch({ verifiedFilter: e.target.value === '' ? '' : e.target.value === 'true' })}
              className="px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-950 dark:border-zinc-600 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
            >
              <option value="">所有状态</option>
              <option value="true">已验证</option>
              <option value="false">未验证</option>
            </select>
          </div>
        </div>
      </div>

      {/* 批量操作 */}
      {state.selectedUsers.size > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-zinc-400">
                已选择 <span className="font-medium text-neutral-900 dark:text-neutral-100">{state.selectedUsers.size}</span> 个用户
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchOperation('verify')}
                  className="h-8"
                >
                  <MailCheck className="w-4 h-4 mr-1" />
                  批量验证
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchOperation('unverify')}
                  className="h-8"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  取消验证
                </Button>
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleBatchOperation('delete')}
                  className="h-8"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  批量删除
                </Button>
              </div>
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
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={state.editingUser.email}
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, email: e.target.value }
                  })}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-950 dark:border-zinc-600 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  用户名
                </label>
                <input
                  type="text"
                  value={state.editingUser.username}
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, username: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-950 dark:border-zinc-600 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-zinc-300">
                  用户角色
                </label>
                <select
                  value={state.editingUser.role}
                  onChange={(e) => dispatch({
                    editingUser: { ...state.editingUser!, role: e.target.value as UserRole }
                  })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white dark:bg-zinc-950 dark:border-zinc-600 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
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
                  className="w-4 h-4 text-black bg-neutral-100 border-neutral-300 rounded focus:ring-neutral-500 dark:focus:ring-neutral-600 dark:ring-offset-gray-800 dark:bg-neutral-700 dark:border-neutral-600"
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
        onConfirm={() => {
          if (state.showDeleteConfirm) {
            return handleDeleteUser(state.showDeleteConfirm);
          }
        }}
        title="确认删除用户"
        message={
          <div className="space-y-3">
            <p className="text-sm text-neutral-600 dark:text-zinc-400">
              您确定要删除这个用户吗？此操作将会：
            </p>
            <ul className="text-sm text-neutral-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li>永久删除用户账户</li>
              <li>清除所有相关数据</li>
              <li>用户将无法再次登录</li>
            </ul>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              此操作无法撤销，请谨慎操作。
            </p>
          </div>
        }
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}