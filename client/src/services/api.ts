import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// 后端 API 的基础 URL (相对于前端)
const API_BASE_URL = '/api';

// 全局维护AccessToken过期时间
let accessTokenExp: number | null = null;

// 创建 Axios 实例，配置 Cookie 传递
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 确保跨域请求
});

// --- Refresh Token Retry Logic State ---
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Silent Refresh逻辑
async function silentRefreshIfNeeded() {
  if (!accessTokenExp) return;
  const now = Math.floor(Date.now() / 1000);
  // 距离过期小于2分钟自动刷新
  if (accessTokenExp - now < 120) {
    try {
      const res = await apiClient.post('/refresh');
      if (res.data && res.data.exp) {
        accessTokenExp = res.data.exp;
      }
    } catch {
      // 刷新失败，交由拦截器处理
    }
  }
}

// 请求拦截器：每次请求前自动Silent Refresh
apiClient.interceptors.request.use(async (config) => {
  await silentRefreshIfNeeded();
  return config;
});

// 添加一个自定义接口来扩展 AxiosRequestConfig
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// 响应拦截器：处理401/403和exp维护，并实现 Refresh Token Retry
apiClient.interceptors.response.use(
  res => {
    if (res.data && typeof res.data.exp === 'number') {
      accessTokenExp = res.data.exp;
    }
    return res;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig | undefined;

    // 检查是否有响应、响应状态和请求配置
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const code = (error.response.data as unknown as { code?: string })?.code;
    const url = originalRequest.url;

    // 如果是刷新接口本身失败，或已重试过，则直接拒绝或处理特定错误
    if (url === '/refresh' || originalRequest._retry) {
        if ((status === 401 && code === 'refresh_token_invalid') ||
            (status === 403 && code === 'refresh_token_compromised') ||
            (status === 403 && code === 'refresh_token_expired')) {
          try {
            await apiClient.post('/logout');
          } catch {}
          if (code === 'refresh_token_compromised') {
            alert('检测到账号异常，已强制下线，请重新登录！');
            window.location.href = '/account/force-logout';
          } else {
             alert('会话已失效或过期，请重新登录。');
             window.location.href = '/account/session-expired';
          }
          return Promise.reject(error); 
        }
        return Promise.reject(error);
    }

    // 处理 Access Token 过期 (普通 401)
    if (status === 401) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(() => apiClient(originalRequest)) // 刷新成功后重试
        .catch(err => Promise.reject(err)); // 刷新失败
      }

      // 标记正在刷新，并设置重试标志
      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        apiClient.post('/refresh')
          .then(res => {
            if (res.data && res.data.exp) {
              accessTokenExp = res.data.exp; // 更新过期时间
            }
            processQueue(null, 'token_refreshed'); // 处理队列
            resolve(apiClient(originalRequest)); // 重试原始请求
          })
          .catch((refreshError) => {
            processQueue(refreshError, null); // 拒绝队列中的请求
            try {
              // Refresh 失败，执行登出
              apiClient.post('/logout'); 
            } catch {}
            alert('您的会话已过期，请重新登录。');
            window.location.href = '/account/session-expired';
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }
    
    // 处理其他特定错误（例如 Refresh Token 本身的问题，如果不是在 /refresh 接口返回的）
    if (status === 403 && code === 'refresh_token_compromised') {
        try { await apiClient.post('/logout'); } catch {} 
        alert('检测到账号异常，已强制下线，请重新登录！');
        window.location.href = '/account/force-logout';
        return Promise.reject(error);
    }
     if (status === 403 && code === 'refresh_token_expired') {
        try { await apiClient.post('/logout'); } catch {} 
        alert('登录已超最大时长，请重新登录。');
        window.location.href = '/account/session-expired';
        return Promise.reject(error);
    }

    // 其他所有错误直接拒绝
    return Promise.reject(error);
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
  return apiClient.post('/logout');
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