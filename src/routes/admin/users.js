/**
 * 用户管理 API 路由
 * 提供管理员用户管理功能
 */
import express from 'express';
import { requireRole, requireUserManagement, getUserRole, getAvailableRoles, ROLES } from '../../middlewares/permissions.js';
import * as User from '../../services/userService.js';

const router = express.Router();

/**
 * 获取用户列表
 * GET /admin/users
 */
router.get('/', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      verified,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search
    } = req.query;

    let result;

    if (search && search.trim()) {
      // 搜索用户
      const users = await User.searchUsers(search, {
        limit: parseInt(limit),
        role: role || null
      });
      
      result = {
        users,
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total: users.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    } else {
      // 获取用户列表
      result = await User.getUsersList({
        page: parseInt(page),
        limit: parseInt(limit),
        role: role || null,
        verified: verified !== undefined ? verified === 'true' : null,
        sortBy,
        sortOrder
      });
    }

    // 获取当前用户的可用角色
    const availableRoles = getAvailableRoles(req.userRole);

    res.json({
      success: true,
      data: result,
      availableRoles
    });

  } catch (error) {
    console.error('[Admin] 获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取用户列表失败'
    });
  }
});

/**
 * 获取单个用户详情
 * GET /admin/users/:userId
 */
router.get('/:userId', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 检查权限 - 是否可以查看此用户
    const targetRole = await getUserRole(userId);
    const managerRole = req.userRole;

    // 管理员可以查看比自己权限低的用户
    if (targetRole && targetRole.level >= managerRole.level && targetRole.userId !== managerRole.userId) {
      return res.status(403).json({
        success: false,
        error: '无权查看此用户'
      });
    }

    // 获取用户统计信息
    const stats = await User.getUserStats(userId);

    // 移除敏感信息
    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
      verified: user.verified,
      totpEnabled: user.totp_enabled,
      githubLinked: !!user.github_id,
      googleLinked: !!user.google_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.json({
      success: true,
      data: {
        user: safeUser,
        stats
      }
    });

  } catch (error) {
    console.error('[Admin] 获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取用户详情失败'
    });
  }
});

/**
 * 更新用户角色
 * PUT /admin/users/:userId/role
 */
router.put('/:userId/role', requireUserManagement(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: '角色参数是必填的'
      });
    }

    // 验证角色值
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: '无效的角色值'
      });
    }

    // 检查权限 - 不能分配比自己更高的权限
    const managerRole = req.managerRole;
    const availableRoles = getAvailableRoles(managerRole);
    const canAssignRole = availableRoles.some(r => r.value === role);

    if (!canAssignRole) {
      return res.status(403).json({
        success: false,
        error: '无权分配此角色'
      });
    }

    // 更新用户角色
    await User.updateUserRole(userId, role);

    res.json({
      success: true,
      message: '用户角色更新成功'
    });

  } catch (error) {
    console.error('[Admin] 更新用户角色失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新用户角色失败'
    });
  }
});

/**
 * 更新用户信息
 * PUT /admin/users/:userId
 */
router.put('/:userId', requireUserManagement(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, username, verified } = req.body;

    const updates = {};
    
    if (email !== undefined) {
      updates.email = email;
    }
    
    if (username !== undefined) {
      updates.username = username;
    }
    
    if (verified !== undefined) {
      updates.verified = verified;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有提供要更新的字段'
      });
    }

    // 执行更新操作
    const results = {};

    if (updates.email) {
      results.email = await User.updateEmail(userId, updates.email);
    }

    if (updates.username !== undefined) {
      results.username = await User.updateUsername(userId, updates.username);
    }

    if (updates.verified !== undefined) {
      results.verified = await User.updateEmailVerified(userId, updates.verified);
    }

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: results
    });

  } catch (error) {
    console.error('[Admin] 更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新用户信息失败'
    });
  }
});

/**
 * 删除用户
 * DELETE /admin/users/:userId
 */
router.delete('/:userId', requireUserManagement(), async (req, res) => {
  try {
    const { userId } = req.params;

    // 删除用户
    await User.deleteUser(userId);

    res.json({
      success: true,
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('[Admin] 删除用户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除用户失败'
    });
  }
});

/**
 * 获取可用角色列表
 * GET /admin/roles
 */
router.get('/roles/available', requireRole(ROLES.ADMIN), async (req, res) => {
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
 * 批量操作用户
 * POST /admin/users/batch
 */
router.post('/batch', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { action, userIds, data } = req.body;

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // 检查权限
        const targetRole = await getUserRole(userId);
        if (!targetRole) {
          errors.push({ userId, error: '用户不存在' });
          continue;
        }

        const managerRole = req.userRole;
        if (targetRole.level >= managerRole.level) {
          errors.push({ userId, error: '权限不足' });
          continue;
        }

        // 执行操作
        switch (action) {
          case 'delete':
            await User.deleteUser(userId);
            results.push({ userId, success: true });
            break;
            
          case 'verify':
            await User.updateEmailVerified(userId, true);
            results.push({ userId, success: true });
            break;
            
          case 'unverify':
            await User.updateEmailVerified(userId, false);
            results.push({ userId, success: true });
            break;
            
          case 'updateRole':
            if (!data || !data.role) {
              errors.push({ userId, error: '缺少角色参数' });
              continue;
            }
            
            const availableRoles = getAvailableRoles(managerRole);
            const canAssignRole = availableRoles.some(r => r.value === data.role);
            
            if (!canAssignRole) {
              errors.push({ userId, error: '无权分配此角色' });
              continue;
            }
            
            await User.updateUserRole(userId, data.role);
            results.push({ userId, success: true });
            break;
            
          default:
            errors.push({ userId, error: '不支持的操作' });
        }

      } catch (error) {
        console.error(`[Admin] 批量操作用户 ${userId} 失败:`, error);
        errors.push({ userId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: userIds.length,
          success: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('[Admin] 批量操作失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '批量操作失败'
    });
  }
});

export default router;