/**
 * 用户服务
 * 使用新的模块化架构，保持API兼容性
 */
import { UserService } from './user/UserService.js';
import { UserOAuthService } from './user/UserOAuthService.js';
import { UserTotpService } from './user/UserTotpService.js';

// 创建服务实例
const userService = new UserService();
const userOAuthService = new UserOAuthService();
const userTotpService = new UserTotpService();

// ================== 用户查找 ==================

export async function findByEmail(email) {
  return userService.findByEmail(email);
}

export async function findById(id) {
  return userService.findById(id);
}

export async function findByGithubId(githubId) {
  return userService.findByGithubId(githubId);
}

export async function findByGoogleId(googleId) {
  return userService.findByGoogleId(googleId);
}

export async function findByUsername(username) {
  return userService.findByUsername(username);
}

// ================== 用户管理 ==================

export async function createUser(userData) {
  return userService.createUser(userData);
}

export async function updateEmail(userId, email) {
  return userService.updateEmail(userId, email);
}

export async function updateUsername(userId, username) {
  return userService.updateUsername(userId, username);
}

export async function updateLocale(userId, locale) {
  return userService.updateLocale(userId, locale);
}

export async function deleteUser(userId) {
  return userService.deleteUser(userId);
}

export async function migratePasswordHash(userId, passwordHash) {
  return userService.migratePasswordHash(userId, passwordHash);
}

export async function updateEmailVerified(userId, verified) {
  return userService.updateEmailVerified(userId, verified);
}

// ================== TOTP相关 ==================

export async function setTotp(id, secret) {
  return userTotpService.setTotpSecret(id, secret);
}

export async function enableTotp(id) {
  return userTotpService.enableTotp(id);
}

export async function getTotpSecret(id) {
  return userTotpService.getTotpSecret(id);
}

export async function disableTotp(userId) {
  return userTotpService.disableTotp(userId);
}

// ================== OAuth绑定 ==================

export async function bindGithubId(userId, githubId) {
  return userOAuthService.bindGithubId(userId, githubId);
}

export async function bindGoogleId(userId, googleId) {
  return userOAuthService.bindGoogleId(userId, googleId);
}

// ================== 角色管理 ==================

export async function updateUserRole(userId, role) {
  return userService.updateUserRole(userId, role);
}

export async function getUsersList(options = {}) {
  return userService.getUsersList(options);
}

export async function searchUsers(query, options = {}) {
  return userService.searchUsers(query, options);
}

export async function getUserStats(userId) {
  return userService.getUserStats(userId);
}

export async function findByIds(userIds) {
  return userService.findByIds(userIds);
}

// ================== 用户对外序列化 ==================

/**
 * 把数据库 user 行转换成可安全下发给客户端的对象。
 *
 * 绝不能把敏感字段返回到浏览器/网络层：
 *  - password_hash：密码哈希；
 *  - totp_secret：TOTP 密钥（即使加密存储，也绝不应离开服务端）。
 *
 * 同时附带派生的 has_password 布尔，供前端判断是否已设置密码（前端只需要布尔，
 * 不需要也不应拿到哈希本身）。
 *
 * @param {Object|null|undefined} user 数据库用户行
 * @param {Object} [extra] 需要额外合并进结果的字段（例如 locale 兜底）
 * @returns {Object|null}
 */
export function toPublicUser(user, extra = {}) {
  if (!user) return null;
  const { password_hash, totp_secret, ...safe } = user;
  return {
    ...safe,
    has_password: !!password_hash,
    ...extra,
  };
}

// ================== 导出服务实例 ==================

export { userService, userOAuthService, userTotpService };
