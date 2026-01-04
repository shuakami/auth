/**
 * OAuth Hook
 * 管理 OAuth 应用的 CRUD 操作
 */

import { useState, useEffect, useCallback, useReducer } from 'react';
import {
  getOAuthApps,
  createOAuthApp,
  updateOAuthApp,
  deleteOAuthApp,
  regenerateClientSecret,
  type OAuthApp,
  type CreateOAuthAppRequest,
  type UpdateOAuthAppRequest,
} from '@/services/oauth';

interface OAuthState {
  apps: OAuthApp[];
  isLoading: boolean;
  error: string | null;
  visibleSecrets: Set<string>;
}

type OAuthAction =
  | { type: 'SET_APPS'; apps: OAuthApp[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'TOGGLE_SECRET'; appId: string }
  | { type: 'RESET_SECRETS' };

function reducer(state: OAuthState, action: OAuthAction): OAuthState {
  switch (action.type) {
    case 'SET_APPS':
      return { ...state, apps: action.apps, isLoading: false, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'TOGGLE_SECRET': {
      const next = new Set(state.visibleSecrets);
      if (next.has(action.appId)) {
        next.delete(action.appId);
      } else {
        next.add(action.appId);
      }
      return { ...state, visibleSecrets: next };
    }
    case 'RESET_SECRETS':
      return { ...state, visibleSecrets: new Set() };
    default:
      return state;
  }
}

const initialState: OAuthState = {
  apps: [],
  isLoading: true,
  error: null,
  visibleSecrets: new Set(),
};

export function useOAuth() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isUpdating, setIsUpdating] = useState(false);

  // 加载应用列表
  const loadApps = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const result = await getOAuthApps();
      dispatch({ type: 'SET_APPS', apps: result.apps });
    } catch (err: any) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: err.response?.data?.error || err.message || '加载 OAuth 应用失败' 
      });
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // 创建应用
  const createApp = useCallback(async (data: CreateOAuthAppRequest): Promise<OAuthApp> => {
    setIsUpdating(true);
    try {
      const result = await createOAuthApp(data);
      await loadApps();
      return result.app;
    } finally {
      setIsUpdating(false);
    }
  }, [loadApps]);

  // 更新应用
  const updateApp = useCallback(async (appId: string, data: UpdateOAuthAppRequest): Promise<void> => {
    setIsUpdating(true);
    try {
      await updateOAuthApp(appId, data);
      await loadApps();
    } finally {
      setIsUpdating(false);
    }
  }, [loadApps]);

  // 删除应用
  const removeApp = useCallback(async (appId: string): Promise<void> => {
    setIsUpdating(true);
    try {
      await deleteOAuthApp(appId);
      await loadApps();
    } finally {
      setIsUpdating(false);
    }
  }, [loadApps]);

  // 重新生成密钥
  const regenerateSecret = useCallback(async (appId: string): Promise<string> => {
    setIsUpdating(true);
    try {
      const result = await regenerateClientSecret(appId);
      await loadApps();
      return result.clientSecret;
    } finally {
      setIsUpdating(false);
    }
  }, [loadApps]);

  // 切换密钥可见性
  const toggleSecretVisibility = useCallback((appId: string) => {
    dispatch({ type: 'TOGGLE_SECRET', appId });
  }, []);

  // 重置密钥可见性
  const resetSecretVisibility = useCallback(() => {
    dispatch({ type: 'RESET_SECRETS' });
  }, []);

  return {
    // 数据
    apps: state.apps,
    isLoading: state.isLoading,
    isUpdating,
    error: state.error,
    visibleSecrets: state.visibleSecrets,

    // 操作
    loadApps,
    createApp,
    updateApp,
    removeApp,
    regenerateSecret,
    toggleSecretVisibility,
    resetSecretVisibility,
  };
}
