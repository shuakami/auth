/**
 * 用户OAuth服务 - 处理OAuth账号绑定和管理
 */
import { smartQuery, smartConnect } from '../../db/index.js';

export class UserOAuthService {
  /**
   * 绑定GitHub账号
   * @param {string} userId 用户ID
   * @param {string} githubId GitHub ID
   * @returns {Promise<boolean>}
   */
  async bindGithubId(userId, githubId) {
    try {
      if (!userId || !githubId) {
        throw new Error('用户ID和GitHub ID是必填字段');
      }

      // 检查GitHub ID是否已被其他用户使用
      const { rows: existingUsers } = await smartQuery(
        'SELECT id FROM users WHERE github_id = $1 AND id != $2',
        [githubId, userId]
      );

      if (existingUsers.length > 0) {
        throw new Error('该GitHub账号已被其他用户绑定');
      }

      // 更新用户的GitHub ID
      const result = await smartQuery(
        'UPDATE users SET github_id = $1, updated_at = NOW() WHERE id = $2',
        [githubId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('用户不存在');
      }

      console.log(`[UserOAuthService] 用户 ${userId} 成功绑定 GitHub: ${githubId}`);
      return true;

    } catch (error) {
      console.error('[UserOAuthService] 绑定GitHub失败:', error);
      throw new Error(error.message || '绑定GitHub账号失败');
    }
  }

  /**
   * 绑定Google账号
   * @param {string} userId 用户ID
   * @param {string} googleId Google ID
   * @returns {Promise<boolean>}
   */
  async bindGoogleId(userId, googleId) {
    try {
      if (!userId || !googleId) {
        throw new Error('用户ID和Google ID是必填字段');
      }

      // 检查Google ID是否已被其他用户使用
      const { rows: existingUsers } = await smartQuery(
        'SELECT id FROM users WHERE google_id = $1 AND id != $2',
        [googleId, userId]
      );

      if (existingUsers.length > 0) {
        throw new Error('该Google账号已被其他用户绑定');
      }

      // 更新用户的Google ID
      const result = await smartQuery(
        'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
        [googleId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('用户不存在');
      }

      console.log(`[UserOAuthService] 用户 ${userId} 成功绑定 Google: ${googleId}`);
      return true;

    } catch (error) {
      console.error('[UserOAuthService] 绑定Google失败:', error);
      throw new Error(error.message || '绑定Google账号失败');
    }
  }

  /**
   * 解绑GitHub账号
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async unbindGithubId(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      // 检查用户是否设置了密码（确保有其他登录方式）
      const { rows: userRows } = await smartQuery(
        'SELECT password_hash, google_id FROM users WHERE id = $1',
        [userId]
      );

      const user = userRows[0];
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.password_hash && !user.google_id) {
        throw new Error('无法解绑，请先设置密码或绑定其他OAuth账号');
      }

      // 解绑GitHub
      const result = await smartQuery(
        'UPDATE users SET github_id = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      if (result.rowCount === 0) {
        throw new Error('解绑失败');
      }

      console.log(`[UserOAuthService] 用户 ${userId} 成功解绑 GitHub`);
      return true;

    } catch (error) {
      console.error('[UserOAuthService] 解绑GitHub失败:', error);
      throw new Error(error.message || '解绑GitHub账号失败');
    }
  }

  /**
   * 解绑Google账号
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>}
   */
  async unbindGoogleId(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      // 检查用户是否设置了密码（确保有其他登录方式）
      const { rows: userRows } = await smartQuery(
        'SELECT password_hash, github_id FROM users WHERE id = $1',
        [userId]
      );

      const user = userRows[0];
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.password_hash && !user.github_id) {
        throw new Error('无法解绑，请先设置密码或绑定其他OAuth账号');
      }

      // 解绑Google
      const result = await smartQuery(
        'UPDATE users SET google_id = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      if (result.rowCount === 0) {
        throw new Error('解绑失败');
      }

      console.log(`[UserOAuthService] 用户 ${userId} 成功解绑 Google`);
      return true;

    } catch (error) {
      console.error('[UserOAuthService] 解绑Google失败:', error);
      throw new Error(error.message || '解绑Google账号失败');
    }
  }

  /**
   * 获取用户的OAuth绑定状态
   * @param {string} userId 用户ID
   * @returns {Promise<Object>}
   */
  async getOAuthBindings(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID是必填字段');
      }

      const { rows } = await smartQuery(
        'SELECT github_id, google_id, password_hash FROM users WHERE id = $1',
        [userId]
      );

      const user = rows[0];
      if (!user) {
        throw new Error('用户不存在');
      }

      return {
        github: {
          bound: !!user.github_id,
          id: user.github_id
        },
        google: {
          bound: !!user.google_id,
          id: user.google_id
        },
        hasPassword: !!user.password_hash,
        canUnbind: {
          github: !!(user.password_hash || user.google_id),
          google: !!(user.password_hash || user.github_id)
        }
      };

    } catch (error) {
      console.error('[UserOAuthService] 获取OAuth绑定状态失败:', error);
      throw new Error(error.message || '获取OAuth绑定状态失败');
    }
  }
}