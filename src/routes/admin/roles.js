/**
 * 角色管理 API 路由
 * 提供管理员角色相关功能
 */
import express from 'express';
import { requireRole, getAvailableRoles, ROLES } from '../../middlewares/permissions.js';

const router = express.Router();

/**
 * 获取可用角色列表
 * GET /admin/roles/available
 */
router.get('/available', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const availableRoles = getAvailableRoles(req.userRole);
    
    res.json({
      success: true,
      data: availableRoles
    });

  } catch (error) {
    console.error('[Admin] 获取可用角色失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取可用角色失败'
    });
  }
});

/**
 * 获取所有角色定义
 * GET /admin/roles/definitions
 */
router.get('/definitions', requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const roleDefinitions = Object.entries(ROLES).map(([key, value]) => ({
      key,
      value,
      label: getRoleLabel(value),
      level: getRoleLevel(value)
    }));
    
    res.json({
      success: true,
      data: roleDefinitions
    });

  } catch (error) {
    console.error('[Admin] 获取角色定义失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取角色定义失败'
    });
  }
});

/**
 * 获取角色的显示标签
 * @param {string} role 角色值
 * @returns {string} 显示标签
 */
function getRoleLabel(role) {
  const labels = {
    'user': '普通用户',
    'admin': '管理员',
    'super_admin': '超级管理员'
  };
  return labels[role] || role;
}

/**
 * 获取角色的权限级别
 * @param {string} role 角色值
 * @returns {number} 权限级别
 */
function getRoleLevel(role) {
  const levels = {
    'user': 1,
    'admin': 2,
    'super_admin': 3
  };
  return levels[role] || 0;
}

export default router;