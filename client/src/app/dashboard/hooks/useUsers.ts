/**
 * Users Hook
 * 管理用户列表和 CRUD 操作（管理员功能）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

export interface UseUsersOptions {
  initialPage?: number;
  pageSize?: number;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { initialPage = 1, pageSize = 20 } = options;

  // 用户列表
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // 筛选和搜索
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | ''>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // 可用角色
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);

  // 选中的用户（批量操作）
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // 状态
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 防抖搜索
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 搜索防抖
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;
      if (verifiedFilter !== '') params.verified = verifiedFilter;

      const result = await getUsersList(params);
      setUsers(result.users);
      setTotalUsers(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder, debouncedSearch, roleFilter, verifiedFilter]);

  // 获取可用角色
  const fetchRoles = useCallback(async () => {
    try {
      const roles = await getAvailableRoles();
      setAvailableRoles(roles);
    } catch {
      // 静默失败，使用默认角色
      setAvailableRoles([
        { value: 'user', label: '用户', level: 1 },
        { value: 'admin', label: '管理员', level: 2 },
        { value: 'super_admin', label: '超级管理员', level: 3 },
      ]);
    }
  }, []);

  // 初始化
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // 更新用户信息
  const updateUser = useCallback(async (
    userId: string,
    data: { email?: string; username?: string; verified?: boolean; role?: UserRole }
  ): Promise<void> => {
    setIsUpdating(true);
    try {
      const { role, ...infoData } = data;
      
      // 更新基本信息
      if (Object.keys(infoData).length > 0) {
        await updateUserInfo(userId, infoData);
      }
      
      // 更新角色
      if (role) {
        await updateUserRole(userId, role);
      }
      
      // 刷新列表
      await fetchUsers();
    } finally {
      setIsUpdating(false);
    }
  }, [fetchUsers]);

  // 删除用户
  const removeUser = useCallback(async (userId: string): Promise<void> => {
    setIsUpdating(true);
    try {
      await deleteUser(userId);
      await fetchUsers();
    } finally {
      setIsUpdating(false);
    }
  }, [fetchUsers]);

  // 批量操作
  const batchOperate = useCallback(async (
    action: 'verify' | 'unverify' | 'delete',
    userIds?: string[]
  ): Promise<{ success: number; failed: number }> => {
    const ids = userIds || Array.from(selectedUsers);
    if (ids.length === 0) {
      throw new Error('请先选择用户');
    }

    setIsUpdating(true);
    try {
      const result = await batchOperateUsers(action, ids);
      setSelectedUsers(new Set());
      await fetchUsers();
      return { success: result.summary.success, failed: result.summary.failed };
    } finally {
      setIsUpdating(false);
    }
  }, [selectedUsers, fetchUsers]);

  // 选择操作
  const toggleSelectUser = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const selectAllUsers = useCallback(() => {
    setSelectedUsers(new Set(users.map(u => u.id)));
  }, [users]);

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  // 分页
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return {
    // 数据
    users,
    totalUsers,
    totalPages,
    currentPage,
    availableRoles,
    selectedUsers,

    // 筛选
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    verifiedFilter,
    setVerifiedFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // 状态
    isLoading,
    isUpdating,
    error,

    // 操作
    fetchUsers,
    updateUser,
    removeUser,
    batchOperate,

    // 选择
    toggleSelectUser,
    selectAllUsers,
    clearSelection,

    // 分页
    goToPage,
  };
}
