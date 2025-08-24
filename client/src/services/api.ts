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

// 全局状态：是否处于登出过程中
let isLoggingOut = false;

// 设置登出状态的函数
export const setLoggingOut = (status: boolean) => {
  isLoggingOut = status;
};

// 响应拦截器：智能处理401错误
apiClient.interceptors.response.use(
  res => {
    // 登录或刷新成功后，响应体中会包含exp，需要更新给TokenManager
    if (res.data && typeof res.data.exp === 'number') {
      tokenManager.updateTokenExpiration(res.data.exp);
    }
    return res;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig | undefined;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = originalRequest.url;

    // 如果是刷新接口本身失败，或已经重试过，直接拒绝
    if (url === '/refresh' || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 如果正在登出过程中，不要尝试刷新
    if (isLoggingOut) {
      return Promise.reject(error);
    }

    // 处理 Access Token 过期 (401)
    if (status === 401) {
      // 检查是否有合理的理由尝试刷新token
      const shouldAttemptRefresh = await shouldAttemptTokenRefresh(url);
      
      if (!shouldAttemptRefresh) {
        console.log('[API Interceptor] 401错误，但不应该尝试刷新token，跳转登录页');
        handleAuthenticationFailure();
        return Promise.reject(error);
      }

      console.log('[API Interceptor] 捕获到401错误，尝试通过TokenManager刷新...');
      originalRequest._retry = true;

      try {
        const refreshed = await tokenManager.manualRefresh();
        if (refreshed) {
          console.log('[API Interceptor] TokenManager刷新成功，重试原始请求:', originalRequest.url);
          return apiClient(originalRequest);
        } else {
          console.error('[API Interceptor] TokenManager报告刷新失败，跳转登录页');
          handleAuthenticationFailure();
          return Promise.reject(new Error('Session expired, please login again.'));
        }
      } catch (refreshError) {
        console.error('[API Interceptor] TokenManager刷新过程中抛出异常:', refreshError);
        handleAuthenticationFailure();
        return Promise.reject(refreshError);
      }
    }
    
    // 其他所有错误直接拒绝
    return Promise.reject(error);
  }
);

// 检查是否应该尝试刷新token
async function shouldAttemptTokenRefresh(url?: string): Promise<boolean> {
  // 如果正在登出，不要刷新
  if (isLoggingOut) {
    return false;
  }

  // 检查是否有有效的refresh token (通过检查cookie)
  if (typeof document !== 'undefined') {
    const hasRefreshToken = document.cookie.includes('refreshToken=');
    if (!hasRefreshToken) {
      console.log('[API Interceptor] 没有refresh token，不尝试刷新');
      return false;
    }
  }

  return true;
}

// 处理认证失败
function handleAuthenticationFailure() {
  // 停止token manager的自动刷新
  tokenManager.stopAutoRefresh();
  
  // 清理本地状态（不调用API以避免循环）
  if (typeof window !== 'undefined') {
    // 标记为登出状态
    setLoggingOut(true);
    
    // 跳转到登录页，保留当前URL为返回地址
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }
}

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
  return apiClient.post('/login', data, { validateStatus: () => true });
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
  setLoggingOut(true); // 标记开始登出流程
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

export const verify2FA = async (data: { token: string; totp?: string; backupCode?: string }) => {
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