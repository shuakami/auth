/**
 * 权限管理中间件
 * 处理用户角色验证和权限检查
 */
import { SUPER_ADMIN_ID } from '../config/env.js';
import * as User from '../services/userService.js';

// 权限级别定义
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin', 
  SUPER_ADMIN: 'super_admin'
};

// 权限级别排序（数字越大权限越高）
const ROLE_LEVELS = {
  [ROLES.USER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPER_ADMIN]: 3
};

/**
 * 获取用户角色信息
 * @param {string} userId 用户ID
 * @returns {Promise<Object>}
 */
export async function getUserRole(userId) {
  try {
    // 检查是否为超级管理员
    if (SUPER_ADMIN_ID && userId === SUPER_ADMIN_ID) {
      return {
        userId,
        role: ROLES.SUPER_ADMIN,
        level: ROLE_LEVELS[ROLES.SUPER_ADMIN],
        isSuperAdmin: true
      };
    }

    // 从数据库获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    const role = user.role || ROLES.USER;
    
    return {
      userId,
      role,
      level: ROLE_LEVELS[role],
      isSuperAdmin: false
    };

  } catch (error) {
    console.error('[Permission] 获取用户角色失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有足够权限
 * @param {Object} userRole 用户角色信息
 * @param {string} requiredRole 需要的最低角色
 * @returns {boolean}
 */
export function hasPermission(userRole, requiredRole) {
  if (!userRole || !userRole.role) {
    return false;
  }

  const userLevel = ROLE_LEVELS[userRole.role] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * 检查用户是否可以管理目标用户
 * @param {Object} managerRole 管理者角色信息
 * @param {Object} targetRole 目标用户角色信息
 * @returns {boolean}
 */
export function canManageUser(managerRole, targetRole) {
  if (!managerRole || !targetRole) {
    return false;
  }

  // 不能管理自己
  if (managerRole.userId === targetRole.userId) {
    return false;
  }

  // 只能管理权限级别比自己低的用户
  return managerRole.level > targetRole.level;
}

/**
 * 权限检查中间件工厂
 * @param {string} requiredRole 需要的最低角色
 * @returns {Function} Express中间件
 */
export function requireRole(requiredRole) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: '未登录',
          code: 'UNAUTHORIZED'
        });
      }

      const userRole = await getUserRole(userId);
      
      if (!userRole) {
        return res.status(403).json({ 
          error: '无法获取用户权限信息',
          code: 'PERMISSION_ERROR'
        });
      }

      if (!hasPermission(userRole, requiredRole)) {
        return res.status(403).json({ 
          error: '权限不足',
          code: 'INSUFFICIENT_PERMISSION',
          required: requiredRole,
          current: userRole.role
        });
      }

      // 将用户角色信息添加到请求对象
      req.userRole = userRole;
      next();

    } catch (error) {
      console.error('[Permission] 权限检查失败:', error);
      res.status(500).json({ 
        error: '权限检查失败',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * 用户管理权限检查中间件
 * 检查是否可以管理指定用户
 */
export function requireUserManagement() {
  return async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      const targetUserId = req.params.userId || req.body?.userId;

      if (!managerId) {
        return res.status(401).json({ 
          error: '未登录',
          code: 'UNAUTHORIZED'
        });
      }

      if (!targetUserId) {
        return res.status(400).json({ 
          error: '缺少目标用户ID',
          code: 'MISSING_TARGET_USER'
        });
      }

      const [managerRole, targetRole] = await Promise.all([
        getUserRole(managerId),
        getUserRole(targetUserId)
      ]);

      if (!managerRole) {
        return res.status(403).json({ 
          error: '无法获取管理者权限信息',
          code: 'PERMISSION_ERROR'
        });
      }

      if (!targetRole) {
        return res.status(404).json({ 
          error: '目标用户不存在',
          code: 'TARGET_USER_NOT_FOUND'
        });
      }

      // 检查是否至少是管理员
      if (!hasPermission(managerRole, ROLES.ADMIN)) {
        return res.status(403).json({ 
          error: '需要管理员权限',
          code: 'INSUFFICIENT_PERMISSION'
        });
      }

      // 检查是否可以管理目标用户
      if (!canManageUser(managerRole, targetRole)) {
        return res.status(403).json({ 
          error: '无法管理同级或更高级别的用户',
          code: 'CANNOT_MANAGE_HIGHER_ROLE'
        });
      }

      // 将角色信息添加到请求对象
      req.managerRole = managerRole;
      req.targetRole = targetRole;
      next();

    } catch (error) {
      console.error('[Permission] 用户管理权限检查失败:', error);
      res.status(500).json({ 
        error: '权限检查失败',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * 获取所有可用角色（供前端使用）
 * @param {Object} userRole 当前用户角色
 * @returns {Array} 可分配的角色列表
 */
export function getAvailableRoles(userRole) {
  if (!userRole) {
    return [];
  }

  const roles = [];
  
  // 普通用户只能看到自己的角色
  if (userRole.level >= ROLE_LEVELS[ROLES.USER]) {
    roles.push({
      value: ROLES.USER,
      label: '普通用户',
      level: ROLE_LEVELS[ROLES.USER]
    });
  }

  // 管理员可以分配普通用户和管理员角色
  if (userRole.level >= ROLE_LEVELS[ROLES.ADMIN]) {
    roles.push({
      value: ROLES.ADMIN,
      label: '管理员',
      level: ROLE_LEVELS[ROLES.ADMIN]
    });
  }

  // 超级管理员可以分配所有角色
  if (userRole.level >= ROLE_LEVELS[ROLES.SUPER_ADMIN]) {
    roles.push({
      value: ROLES.SUPER_ADMIN,
      label: '超级管理员',
      level: ROLE_LEVELS[ROLES.SUPER_ADMIN]
    });
  }

  return roles;
}

/**
 * 检查是否为超级管理员
 * @param {string} userId 用户ID
 * @returns {boolean}
 */
export function isSuperAdmin(userId) {
  return SUPER_ADMIN_ID && userId === SUPER_ADMIN_ID;
}

/**
 * 初始化超级管理员
 * 确保超级管理员在数据库中有正确的角色
 */
export async function initializeSuperAdmin() {
  try {
    if (!SUPER_ADMIN_ID) {
      console.log('[Permission] 未配置SUPER_ADMIN_ID，跳过超级管理员初始化');
      return;
    }

    const user = await User.findById(SUPER_ADMIN_ID);
    if (user && user.role !== ROLES.SUPER_ADMIN) {
      // 更新超级管理员角色
      await User.updateUserRole(SUPER_ADMIN_ID, ROLES.SUPER_ADMIN);
      console.log(`[Permission] 已将用户 ${SUPER_ADMIN_ID} 设置为超级管理员`);
    } else if (user) {
      console.log(`[Permission] 超级管理员 ${SUPER_ADMIN_ID} 权限正常`);
    } else {
      console.warn(`[Permission] 超级管理员ID ${SUPER_ADMIN_ID} 对应的用户不存在`);
    }

  } catch (error) {
    console.error('[Permission] 初始化超级管理员失败:', error);
  }
}

export default {
  ROLES,
  getUserRole,
  hasPermission,
  canManageUser,
  requireRole,
  requireUserManagement,
  getAvailableRoles,
  isSuperAdmin,
  initializeSuperAdmin
};