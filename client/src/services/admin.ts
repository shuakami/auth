/**
 * 管理员API服务
 */
import api from './api';

// 用户角色类型
export type UserRole = 'user' | 'admin' | 'super_admin';

// 用户信息接口
export interface User {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  verified: boolean;
  totpEnabled: boolean;
  biometricEnabled: boolean;
  githubLinked: boolean;
  googleLinked: boolean;
  createdAt: string;
  updatedAt: string;
}

// 用户列表响应接口
export interface UsersListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 角色选项接口
export interface RoleOption {
  value: UserRole;
  label: string;
  level: number;
}

// 批量操作结果接口
export interface BatchOperationResult {
  results: Array<{ userId: string; success: boolean }>;
  errors: Array<{ userId: string; error: string }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

/**
 * 获取用户列表
 */
export async function getUsersList(params: {
  page?: number;
  limit?: number;
  role?: UserRole;
  verified?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
} = {}): Promise<UsersListResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const response = await api.get(`/admin/users?${searchParams.toString()}`);
  return response.data.data;
}

/**
 * 获取单个用户详情
 */
export async function getUserDetails(userId: string): Promise<{ user: User; stats: any }> {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data.data;
}

/**
 * 更新用户角色
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await api.put(`/admin/users/${userId}/role`, { role });
}

/**
 * 更新用户信息
 */
export async function updateUserInfo(userId: string, data: {
  email?: string;
  username?: string;
  verified?: boolean;
}): Promise<void> {
  await api.put(`/admin/users/${userId}`, data);
}

/**
 * 删除用户
 */
export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}`);
}

/**
 * 获取可用角色列表
 */
export async function getAvailableRoles(): Promise<RoleOption[]> {
  const response = await api.get('/admin/roles/available');
  return response.data.data;
}

/**
 * 批量操作用户
 */
export async function batchOperateUsers(action: string, userIds: string[], data?: any): Promise<BatchOperationResult> {
  const response = await api.post('/admin/users/batch', {
    action,
    userIds,
    data
  });
  return response.data.data;
}

/**
 * 搜索用户
 */
export async function searchUsers(query: string, options: {
  limit?: number;
  role?: UserRole;
} = {}): Promise<User[]> {
  const params = new URLSearchParams({ search: query });
  
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.role) params.append('role', options.role);

  const response = await getUsersList({ search: query, ...options });
  return response.users;
}

/**
 * 检查当前用户是否有管理员权限
 */
export async function checkAdminPermission(): Promise<boolean> {
  try {
    await api.get('/admin/users?limit=1');
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  getUsersList,
  getUserDetails,
  updateUserRole,
  updateUserInfo,
  deleteUser,
  getAvailableRoles,
  batchOperateUsers,
  searchUsers,
  checkAdminPermission
};