/**
 * OAuth应用管理API服务
 */
import api from './api';

// OAuth应用类型
export interface OAuthApp {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  scopes: string[];
  type: 'web' | 'mobile' | 'desktop' | 'server';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

// 创建应用请求
export interface CreateOAuthAppRequest {
  name: string;
  description?: string;
  type: 'web' | 'mobile' | 'desktop' | 'server';
  redirectUris: string[];
  scopes: string[];
}

// 更新应用请求
export interface UpdateOAuthAppRequest {
  name?: string;
  description?: string;
  redirectUris?: string[];
  scopes?: string[];
  isActive?: boolean;
}

/**
 * 获取OAuth应用列表
 */
export async function getOAuthApps(): Promise<{ apps: OAuthApp[] }> {
  const response = await api.get('/oauth/apps');
  return response.data.data;
}

/**
 * 获取单个OAuth应用详情
 */
export async function getOAuthApp(id: string): Promise<{ app: OAuthApp }> {
  const response = await api.get(`/oauth/apps/${id}`);
  return response.data.data;
}

/**
 * 创建OAuth应用
 */
export async function createOAuthApp(data: CreateOAuthAppRequest): Promise<{ app: OAuthApp }> {
  const response = await api.post('/oauth/apps', data);
  return response.data.data;
}

/**
 * 更新OAuth应用
 */
export async function updateOAuthApp(id: string, data: UpdateOAuthAppRequest): Promise<{ app: OAuthApp }> {
  const response = await api.put(`/oauth/apps/${id}`, data);
  return response.data.data;
}

/**
 * 删除OAuth应用
 */
export async function deleteOAuthApp(id: string): Promise<void> {
  await api.delete(`/oauth/apps/${id}`);
}

/**
 * 重新生成客户端密钥
 */
export async function regenerateClientSecret(id: string): Promise<{ clientSecret: string }> {
  const response = await api.post(`/oauth/apps/${id}/regenerate-secret`);
  return response.data.data;
}

export default {
  getOAuthApps,
  getOAuthApp,
  createOAuthApp,
  updateOAuthApp,
  deleteOAuthApp,
  regenerateClientSecret
};