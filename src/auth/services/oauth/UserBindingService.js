/**
 * 用户绑定服务 - 处理OAuth账号绑定和合并逻辑
 */
import { v4 as uuidv4 } from 'uuid';
import * as User from '../../../services/userService.js';

export class UserBindingService {
  /**
   * 处理OAuth用户绑定或创建
   * @param {Object} normalizedUserInfo 标准化的用户信息
   * @returns {Promise<Object>} 用户信息
   */
  async handleUserBinding(normalizedUserInfo) {
    const { provider, id: providerId, email } = normalizedUserInfo;
    
    console.log(`[OAuth] 开始处理${provider}用户绑定:`, { providerId, email });

    // 根据provider类型查找用户
    const userByProvider = await this._findUserByProvider(provider, providerId);
    const userByEmail = await User.findByEmail(email);

    // 处理绑定逻辑
    let user = await this._processBinding(userByProvider, userByEmail, normalizedUserInfo);

    if (!user) {
      // 创建新用户
      user = await this._createNewUser(normalizedUserInfo);
    }

    console.log(`[OAuth] ${provider}用户绑定完成:`, { userId: user.id, email: user.email });
    return user;
  }

  /**
   * 根据提供商查找用户
   * @param {string} provider 提供商名称
   * @param {string} providerId 提供商用户ID
   * @returns {Promise<Object|null>}
   * @private
   */
  async _findUserByProvider(provider, providerId) {
    switch (provider) {
      case 'github':
        return User.findByGithubId(providerId);
      case 'google':
        return User.findByGoogleId(providerId);
      default:
        throw new Error(`不支持的OAuth提供商: ${provider}`);
    }
  }

  /**
   * 绑定提供商ID到用户
   * @param {string} userId 用户ID
   * @param {string} provider 提供商名称
   * @param {string} providerId 提供商用户ID
   * @returns {Promise<void>}
   * @private
   */
  async _bindProviderToUser(userId, provider, providerId) {
    switch (provider) {
      case 'github':
        return User.bindGithubId(userId, providerId);
      case 'google':
        return User.bindGoogleId(userId, providerId);
      default:
        throw new Error(`不支持的OAuth提供商: ${provider}`);
    }
  }

  /**
   * 处理用户绑定逻辑
   * @param {Object|null} userByProvider 通过提供商找到的用户
   * @param {Object|null} userByEmail 通过邮箱找到的用户
   * @param {Object} normalizedUserInfo 标准化用户信息
   * @returns {Promise<Object|null>}
   * @private
   */
  async _processBinding(userByProvider, userByEmail, normalizedUserInfo) {
    const { provider, id: providerId } = normalizedUserInfo;

    // 情况1: 邮箱用户存在但未绑定当前提供商
    if (userByEmail && !this._hasProviderBinding(userByEmail, provider)) {
      console.log(`[OAuth] 将${provider}账号绑定到现有邮箱用户`);
      await this._bindProviderToUser(userByEmail.id, provider, providerId);
      userByEmail[`${provider}_id`] = providerId;
      return userByEmail;
    }

    // 情况2: 提供商用户和邮箱用户都存在但是不同用户（需要合并）
    if (userByProvider && userByEmail && userByProvider.id !== userByEmail.id) {
      console.log(`[OAuth] 检测到账号冲突，执行账号合并`);
      return this._mergeUsers(userByProvider, userByEmail, provider);
    }

    // 情况3: 返回已存在的用户
    return userByProvider || userByEmail;
  }

  /**
   * 检查用户是否已绑定指定提供商
   * @param {Object} user 用户对象
   * @param {string} provider 提供商名称
   * @returns {boolean}
   * @private
   */
  _hasProviderBinding(user, provider) {
    return !!user[`${provider}_id`];
  }

  /**
   * 合并用户账号
   * @param {Object} userByProvider 提供商用户
   * @param {Object} userByEmail 邮箱用户
   * @param {string} provider 提供商名称
   * @returns {Promise<Object>}
   * @private
   */
  async _mergeUsers(userByProvider, userByEmail, provider) {
    console.log(`[OAuth] 开始合并用户账号: ${userByProvider.id} -> ${userByEmail.id}`);

    // 如果提供商用户有密码而邮箱用户没有，迁移密码
    if (userByProvider.password_hash && !userByEmail.password_hash) {
      console.log(`[OAuth] 迁移密码哈希到邮箱用户`);
      await User.migratePasswordHash(userByEmail.id, userByProvider.password_hash);
    }

    // 重新获取更新后的邮箱用户
    return User.findByEmail(userByEmail.email);
  }

  /**
   * 创建新的OAuth用户
   * @param {Object} normalizedUserInfo 标准化用户信息
   * @returns {Promise<Object>}
   * @private
   */
  async _createNewUser(normalizedUserInfo) {
    const { provider, id: providerId, email, username } = normalizedUserInfo;
    
    console.log(`[OAuth] 创建新的${provider}用户:`, { email, username });

    const userId = uuidv4();
    const createParams = {
      id: userId,
      email,
      username,
      verified: true // OAuth用户默认已验证
    };

    // 设置提供商特定的ID
    if (provider === 'github') {
      createParams.githubId = providerId;
    } else if (provider === 'google') {
      createParams.googleId = providerId;
    }

    await User.createUser(createParams);
    return User.findByEmail(email);
  }
}