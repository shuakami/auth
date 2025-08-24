import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from './EnhancedTokenManager';

// @ts-ignore
declare global {
  interface Window {
    __SESSION_EXPIRED_SHOWN__?: boolean;
  }
}

// @ts-ignore
if (typeof window !== 'undefined' && window.__SESSION_EXPIRED_SHOWN__ === undefined) {
  // @ts-ignore
  window.__SESSION_EXPIRED_SHOWN__ = false;
}

// 后端 API 的基础 URL (相对于前端)
const API_BASE_URL = '/api';

// 创建 Axios 实例，配置 Cookie 传递
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// 添加一个自定义接口来扩展 AxiosRequestConfig
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void; }> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

// 响应拦截器：处理401/403，并委托给EnhancedTokenManager
apiClient.interceptors.response.use(
  res => {
    // 登录或刷新成功后，响应体中会包含exp，需要更新给TokenManager
    if (res.data && typeof res.data.exp === 'number') {
      tokenManager.updateTokenExpiration(res.data.exp);
    }
    return res;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest.url === '/refresh') {
      console.error('[API Interceptor] Refresh token本身已失效, 无法刷新。');
      tokenManager.stopAutoRefresh();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?reason=session_expired';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      console.log('[API Interceptor] 侦测到401，开始刷新Token...');
      const { data } = await apiClient.post('/refresh');
      tokenManager.updateTokenExpiration(data.exp);
      console.log('[API Interceptor] Token刷新成功，处理等待队列...');
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      console.error('[API Interceptor] 刷新Token失败:', refreshError);
      processQueue(refreshError as Error);
      tokenManager.stopAutoRefresh();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?reason=refresh_failed';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// --- 认证相关 API ---

// Define interface for login payload
interface LoginPayload {
  email: string;
  password: string;
  token?: string;
  backupCode?: string;
}

export const login = async (
  email: string,
  password: string,
  opts?: { token?: string; backupCode?: string }
) => {
  const data: LoginPayload = { email, password };
  if (opts?.token) data.token = opts.token;
  if (opts?.backupCode) data.backupCode = opts.backupCode;
  // 移除 validateStatus，让axios在4xx/5xx时自然地抛出错误
  return apiClient.post('/login', data);
};

export const register = async (email: string, password: string, username?: string | null) => {
  // 注意：后端 register 接口现在不返回用户信息，只返回 ok 和 message
  return apiClient.post('/register', { email, password, username });
};

export const verifyEmail = async (token: string) => {
  // GET 请求，token 作为查询参数
  return apiClient.get(`/verify?token=${token}`);
};

export const fetchCurrentUser = async () => {
  // 获取当前用户信息
  return apiClient.get('/me');
};

export const logout = async () => {
  try {
    return await apiClient.post('/logout');
  } catch (error) {
    // 即使登出API失败，也要完成清理流程
    console.warn('[API] Logout API failed, but continuing cleanup:', error);
    throw error;
  } finally {
    // 无论API是否成功，都要完成本地清理
    tokenManager.stopAutoRefresh();
  }
};

// --- 2FA 相关 API (如果需要) ---

export const setup2FA = async (password: string) => {
  return apiClient.post('/2fa/setup', { password });
};

export const verify2FA = async (data: { email: string; totp?: string; backupCode?: string }) => {
  return apiClient.post('/2fa/verify', data);
};

export const generateBackupCodes = async (password?: string) => {
  return apiClient.post('/backup-codes/generate', password ? { password } : {});
};

export const getRemainingBackupCodes = async () => {
  return apiClient.get('/backup-codes/remaining');
};

export const forgotPassword = async (email: string) => {
  try {
    const res = await apiClient.post('/forgot-password', { email });
    return res.data;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = err as { response?: { data?: unknown } };
        if (response.response) {
            return response.response.data;
        }
    }
    throw err;
  }
};

export const resetPassword = async (token: string, password: string) => {
  return apiClient.post('/reset-password', { token, password });
};

interface DeleteAccountPayload {
  password?: string;
  code?: string;
}

export const deleteAccount = async (data: DeleteAccountPayload) => {
  return apiClient.delete('/me', { data }); // Send credentials in the request body for DELETE
};

export const updatePassword = async (data: { oldPassword?: string; newPassword: string }) => {
  return apiClient.patch('/me/password', data);
};

export const resendVerifyEmail = async (email?: string) => {
  return apiClient.post('/resend-verify', email ? { email } : {});
};

export const disable2FA = async (data: { email?: string; password?: string; token?: string; backupCode?: string }) => {
  // 必须传token或备份码
  return apiClient.post('/2fa/disable', data);
};

export const updateUsername = async (username: string) => {
  return apiClient.patch('/me/username', { username });
};

export const updateEmail = async (data: { newEmail: string; password: string }) => {
  return apiClient.patch('/me/email', data);
};


export const getSessions = async () => {
  return apiClient.get('/session/list');
};

export const revokeSession = async (sessionId: string) => {
  return apiClient.delete(`/session/${sessionId}`);
};

export default apiClient;