/**
 * 用户服务
 * 提供用户管理的核心功能，包含缓存和验证逻辑
 */
import { smartQuery, smartConnect } from '../../db/index.js';
import { validateEmail } from '../../utils/validation.js';

export class UserService {
  constructor() {
    this.cache = new Map(); // 简单内存缓存
    this.CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 根据邮箱查找用户
   * @param {string} email 邮箱地址
   * @param {boolean} useCache 是否使用缓存
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, useCache = true) {
    try {
      if (!email) return null;

      const normalizedEmail = email.toLowerCase().trim();
      const cacheKey = `email:${normalizedEmail}`;

      // 检查缓存
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_TTL) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      const { rows } = await smartQuery(
        'SELECT * FROM users WHERE email = $1',
        [normalizedEmail]
      );

      const user = rows[0] || null;

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, {
          data: user,
          timestamp: Date.now()
        });
      }

      return user;

    } catch (error) {
      console.error('[UserService] 根据邮箱查找用户失败:', error);
      throw new Error('查找用户失败');
    }
  }

  /**
   * 根据ID查找用户
   * @param {string} id 用户ID
   * @param {boolean} useCache 是否使用缓存
   * @returns {Promise<Object|null>}
   */
  async findById(id, useCache = true) {
    try {
      if (!id) return null;

      const cacheKey = `id:${id}`;

      // 检查缓存
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_TTL) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      const { rows } = await smartQuery(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      const user = rows[0] || null;

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, {
          data: user,
          timestamp: Date.now()
        });
      }

      return user;

    } catch (error) {
      console.error('[UserService] 根据ID查找用户失败:', error);
      throw new Error('查找用户失败');
    }
  }

  /**
   * 根据用户名查找用户
   * @param {string} username 用户名
   * @returns {Promise<Object|null>}
   */
  async findByUsername(username) {
    try {
      if (!username) return null;

      const normalizedUsername = username.toLowerCase().trim();
      const { rows } = await smartQuery(
        'SELECT * FROM users WHERE LOWER(username) = $1',
        [normalizedUsername]
      );

      return rows[0] || null;

    } catch (error) {
      console.error('[UserService] 根据用户名查找用户失败:', error);
      throw new Error('查找用户失败');
    }
  }

  /**
   * 根据GitHub ID查找用户
   * @param {string} githubId GitHub ID
   * @returns {Promise<Object|null>}
   */
  async findByGithubId(githubId) {
    try {
      if (!githubId) return null;

      const { rows } = await smartQuery(
        'SELECT * FROM users WHERE github_id = $1',
        [githubId]
      );

      return rows[0] || null;

    } catch (error) {
      console.error('[UserService] 根据GitHub ID查找用户失败:', error);
      throw new Error('查找用户失败');
    }
  }

  /**
   * 根据Google ID查找用户
   * @param {string} googleId Google ID
   * @returns {Promise<Object|null>}
   */
  async findByGoogleId(googleId) {
    try {
      if (!googleId) return null;

      const { rows } = await smartQuery(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      return rows[0] || null;

    } catch (error) {
      console.error('[UserService] 根据Google ID查找用户失败:', error);
      throw new Error('查找用户失败');
    }
  }

  /**
   * 创建新用户
   * @param {Object} userData 用户数据
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    const {
      id,
      email,
      username = null,
      passwordHash = null,
      githubId = null,
      googleId = null,
      verified = false
    } = userData;

    try {
      // 验证必填字段
      if (!id || !email) {
        throw new Error('用户ID和邮箱是必填字段');
      }

      // 验证邮箱格式
      if (!validateEmail(email)) {
        throw new Error('邮箱格式无效');
      }

      const normalizedEmail = email.toLowerCase().trim();

      // 检查邮箱是否已存在
      const existingUser = await this.findByEmail(normalizedEmail, false);
      if (existingUser) {
        throw new Error('邮箱已被注册');
      }

      // 检查用户名是否已存在（如果提供）
      if (username) {
        const existingUsername = await this.findByUsername(username);
        if (existingUsername) {
          throw new Error('用户名已被使用');
        }
      }

      // 创建用户
      await smartQuery(
        `INSERT INTO users (id, email, username, password_hash, github_id, google_id, verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [id, normalizedEmail, username, passwordHash, githubId, googleId, verified]
      );

      // 清除相关缓存
      this._invalidateUserCache(normalizedEmail, id);

      console.log(`[UserService] 用户创建成功: ${id} (${normalizedEmail})`);

      return {
        id,
        email: normalizedEmail,
        username,
        verified,
        createdAt: new Date()
      };

    } catch (error) {
      console.error('[UserService] 创建用户失败:', error);
      throw new Error(error.message || '创建用户失败');
    }
  }

  /**
   * 更新用户邮箱
   * @param {string} userId 用户ID
   * @param {string} newEmail 新邮箱
   * @returns {Promise<boolean>}
   */
  async updateEmail(userId, newEmail) {
    try {
      if (!userId || !newEmail) {
        throw new Error('用户ID和邮箱是必填字段');
      }

      if (!validateEmail(newEmail)) {
        throw new Error('邮箱格式无效');
      }

      const normalizedEmail = newEmail.toLowerCase().trim();

      // 检查新邮箱是否已被其他用户使用
      const existingUser = await this.findByEmail(normalizedEmail, false);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('该邮箱已被其他用户使用');
      }

      // 获取当前用户信息（用于清除缓存）
      const currentUser = await this.findById(userId, false);
      if (!currentUser) {
        throw new Error('用户不存在');
      }

      // 更新邮箱
      const result = await smartQuery(
        'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
        [normalizedEmail, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('更新失败，用户不存在');
      }

      // 清除缓存
      this._invalidateUserCache(currentUser.email, userId);
      this._invalidateUserCache(normalizedEmail, userId);

      console.log(`[UserService] 用户 ${userId} 邮箱更新成功: ${normalizedEmail}`);
      return true;

    } catch (error) {
      console.error('[UserService] 更新邮箱失败:', error);
      throw new Error(error.message || '更新邮箱失败');
    }
  }

  /**
   * 更新用户名
   * @param {string} userId 用户ID
   * @param {string} newUsername 新用户名
   * @returns {Promise<boolean>}
   */
  async updateUsername(userId, newUsername) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      // 验证用户名（如果提供）
      if (newUsername) {
        if (newUsername.length < 3 || newUsername.length > 20) {
          throw new Error('用户名长度必须在3-20个字符之间');
        }

        // 检查用户名是否已被使用
        const existingUser = await this.findByUsername(newUsername);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('该用户名已被使用');
        }
      }

      // 更新用户名
      const result = await smartQuery(
        'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2',
        [newUsername, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('更新失败，用户不存在');
      }

      // 清除缓存
      this._invalidateUserCache(null, userId);

      console.log(`[UserService] 用户 ${userId} 用户名更新成功: ${newUsername}`);
      return true;

    } catch (error) {
      console.error('[UserService] 更新用户名失败:', error);
      throw new Error(error.message || '更新用户名失败');
    }
  }

  /**
   * 删除用户
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      // 获取用户信息（用于清除缓存）
      const user = await this.findById(userId, false);
      if (!user) {
        throw new Error('用户不存在');
      }

      const client = await smartConnect();
      try {
        await client.query('BEGIN');

        // 删除相关数据（按依赖关系顺序）
        await client.query('DELETE FROM backup_codes WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM login_history WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        await client.query('COMMIT');

        // 清除缓存
        this._invalidateUserCache(user.email, userId);

        console.log(`[UserService] 用户 ${userId} 及相关数据删除成功`);
        return true;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('[UserService] 删除用户失败:', error);
      throw new Error(error.message || '删除用户失败');
    }
  }

  /**
   * 更新邮箱验证状态
   * @param {string} userId 用户ID
   * @param {boolean} verified 验证状态
   * @returns {Promise<boolean>}
   */
  async updateEmailVerified(userId, verified) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const result = await smartQuery(
        'UPDATE users SET verified = $1, updated_at = NOW() WHERE id = $2',
        [verified, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('更新失败，用户不存在');
      }

      // 清除缓存
      this._invalidateUserCache(null, userId);

      console.log(`[UserService] 用户 ${userId} 邮箱验证状态更新: ${verified}`);
      return true;

    } catch (error) {
      console.error('[UserService] 更新邮箱验证状态失败:', error);
      throw new Error(error.message || '更新邮箱验证状态失败');
    }
  }

  /**
   * 迁移密码哈希
   * @param {string} userId 用户ID
   * @param {string} passwordHash 新密码哈希
   * @returns {Promise<boolean>}
   */
  async migratePasswordHash(userId, passwordHash) {
    try {
      if (!userId || !passwordHash) {
        throw new Error('用户ID和密码哈希是必填字段');
      }

      const result = await smartQuery(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('更新失败，用户不存在');
      }

      // 清除缓存
      this._invalidateUserCache(null, userId);

      console.log(`[UserService] 用户 ${userId} 密码哈希迁移成功`);
      return true;

    } catch (error) {
      console.error('[UserService] 迁移密码哈希失败:', error);
      throw new Error(error.message || '迁移密码哈希失败');
    }
  }

  /**
   * 获取用户统计信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await smartQuery(
        `SELECT 
           u.created_at,
           u.updated_at,
           u.verified,
           u.totp_enabled,
           COUNT(DISTINCT rt.id) as active_sessions,
           COUNT(DISTINCT lh.id) as total_logins,
           COUNT(DISTINCT bc.id) as backup_codes_count,
           MAX(lh.login_at) as last_login
         FROM users u
         LEFT JOIN refresh_tokens rt ON u.id = rt.user_id AND rt.revoked = FALSE AND rt.expires_at > NOW()
         LEFT JOIN login_history lh ON u.id = lh.user_id AND lh.success = TRUE
         LEFT JOIN backup_codes bc ON u.id = bc.user_id AND bc.used = FALSE
         WHERE u.id = $1
         GROUP BY u.id, u.created_at, u.updated_at, u.verified, u.totp_enabled`,
        [userId]
      );

      const stats = rows[0];
      if (!stats) {
        throw new Error('用户不存在');
      }

      return {
        accountAge: Math.floor((Date.now() - new Date(stats.created_at).getTime()) / (24 * 60 * 60 * 1000)),
        verified: stats.verified,
        totpEnabled: stats.totp_enabled,
        activeSessions: parseInt(stats.active_sessions),
        totalLogins: parseInt(stats.total_logins),
        backupCodesCount: parseInt(stats.backup_codes_count),
        lastLogin: stats.last_login,
        lastUpdated: stats.updated_at
      };

    } catch (error) {
      console.error('[UserService] 获取用户统计失败:', error);
      throw new Error(error.message || '获取用户统计失败');
    }
  }

  /**
   * 批量查找用户
   * @param {Array} userIds 用户ID数组
   * @returns {Promise<Array>}
   */
  async findByIds(userIds) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }

      // 过滤重复ID
      const uniqueIds = [...new Set(userIds)];

      // 检查缓存
      const cachedUsers = [];
      const uncachedIds = [];

      uniqueIds.forEach(id => {
        const cacheKey = `id:${id}`;
        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.CACHE_TTL) {
            if (cached.data) {
              cachedUsers.push(cached.data);
            }
            return;
          }
          this.cache.delete(cacheKey);
        }
        uncachedIds.push(id);
      });

      // 查询未缓存的用户
      let dbUsers = [];
      if (uncachedIds.length > 0) {
        const placeholders = uncachedIds.map((_, i) => `$${i + 1}`).join(',');
        const { rows } = await smartQuery(
          `SELECT * FROM users WHERE id IN (${placeholders})`,
          uncachedIds
        );
        dbUsers = rows;

        // 缓存查询结果
        dbUsers.forEach(user => {
          this.cache.set(`id:${user.id}`, {
            data: user,
            timestamp: Date.now()
          });
        });
      }

      return [...cachedUsers, ...dbUsers];

    } catch (error) {
      console.error('[UserService] 批量查找用户失败:', error);
      throw new Error('批量查找用户失败');
    }
  }

  /**
   * 清除用户缓存
   * @param {string} email 邮箱（可选）
   * @param {string} userId 用户ID（可选）
   * @private
   */
  _invalidateUserCache(email, userId) {
    if (email) {
      this.cache.delete(`email:${email.toLowerCase()}`);
    }
    if (userId) {
      this.cache.delete(`id:${userId}`);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.cache.clear();
    console.log('[UserService] 缓存已清除');
  }

  /**
   * 获取缓存统计
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000, // 假设的最大缓存大小
      ttl: this.CACHE_TTL
    };
  }

  // ================== 角色管理 ==================

  /**
   * 更新用户角色
   * @param {string} userId 用户ID
   * @param {string} role 新角色
   * @returns {Promise<boolean>}
   */
  async updateUserRole(userId, role) {
    try {
      if (!userId || !role) {
        throw new Error('用户ID和角色是必填字段');
      }

      // 验证角色值
      const validRoles = ['user', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        throw new Error('无效的角色值');
      }

      const result = await smartQuery(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
        [role, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('更新失败，用户不存在');
      }

      // 清除缓存
      this._invalidateUserCache(null, userId);

      console.log(`[UserService] 用户 ${userId} 角色更新为: ${role}`);
      return true;

    } catch (error) {
      console.error('[UserService] 更新用户角色失败:', error);
      throw new Error(error.message || '更新用户角色失败');
    }
  }

  /**
   * 获取用户列表（管理功能）
   * @param {Object} options 查询选项
   * @returns {Promise<Object>}
   */
  async getUsersList(options = {}) {
    const {
      page = 1,
      limit = 20,
      role = null,
      verified = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // 角色筛选
      if (role) {
        whereClause += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      // 验证状态筛选
      if (verified !== null) {
        whereClause += ` AND verified = $${paramIndex}`;
        params.push(verified);
        paramIndex++;
      }

      // 验证排序字段
      const validSortFields = ['id', 'email', 'username', 'role', 'verified', 'created_at', 'updated_at'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // 查询用户列表
      const { rows: users } = await smartQuery(
        `SELECT 
           id, email, username, role, verified, totp_enabled, 
           github_id IS NOT NULL as github_linked,
           google_id IS NOT NULL as google_linked,
           created_at, updated_at
         FROM users 
         ${whereClause}
         ORDER BY ${sortField} ${order}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // 查询总数
      const { rows: countResult } = await smartQuery(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );

      const total = parseInt(countResult[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role || 'user',
          verified: user.verified,
          totpEnabled: user.totp_enabled,
          githubLinked: user.github_linked,
          googleLinked: user.google_linked,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('[UserService] 获取用户列表失败:', error);
      throw new Error('获取用户列表失败');
    }
  }

  /**
   * 搜索用户
   * @param {string} query 搜索关键词
   * @param {Object} options 搜索选项
   * @returns {Promise<Array>}
   */
  async searchUsers(query, options = {}) {
    const { limit = 10, role = null } = options;

    try {
      if (!query || query.trim().length < 2) {
        throw new Error('搜索关键词至少需要2个字符');
      }

      const searchTerm = `%${query.trim().toLowerCase()}%`;
      let whereClause = 'WHERE (LOWER(email) LIKE $1 OR LOWER(username) LIKE $1)';
      const params = [searchTerm];
      let paramIndex = 2;

      // 角色筛选
      if (role) {
        whereClause += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      const { rows } = await smartQuery(
        `SELECT 
           id, email, username, role, verified, totp_enabled,
           created_at, updated_at
         FROM users 
         ${whereClause}
         ORDER BY 
           CASE WHEN LOWER(email) = LOWER($1) THEN 1
                WHEN LOWER(username) = LOWER($1) THEN 2
                ELSE 3 END,
           created_at DESC
         LIMIT $${paramIndex}`,
        [...params, limit]
      );

      return rows.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'user',
        verified: user.verified,
        totpEnabled: user.totp_enabled,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

    } catch (error) {
      console.error('[UserService] 搜索用户失败:', error);
      throw new Error(error.message || '搜索用户失败');
    }
  }
}