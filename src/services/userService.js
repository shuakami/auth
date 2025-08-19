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

// ================== 导出服务实例 ==================

export { userService, userOAuthService, userTotpService };
