import axios from 'axios';

// 后端 API 的基础 URL (相对于前端)
const API_BASE_URL = '/api';

// 全局维护AccessToken过期时间
let accessTokenExp: number | null = null;

// 创建 Axios 实例，配置 Cookie 传递
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 确保跨域请求
});

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

// 响应拦截器：处理401/403和exp维护
apiClient.interceptors.response.use(
  res => {
    // 登录/刷新等接口下发exp时，维护全局exp
    if (res.data && typeof res.data.exp === 'number') {
      accessTokenExp = res.data.exp;
    }
    return res;
  },
  async err => {
    const status = err.response?.status;
    const code = err.response?.data?.code;
    // 401: Token失效，尝试刷新，跳转会话过期页
    if (status === 401 && code === 'refresh_token_invalid') {
      try {
        await apiClient.post('/logout');
      } catch {}
      window.location.href = '/account/session-expired';
      return;
    }
    // 403: Refresh被盗/异常，跳转强制下线页
    if (status === 403 && code === 'refresh_token_compromised') {
      alert('检测到账号异常，已强制下线，请重新登录！');
      await apiClient.post('/logout');
      window.location.href = '/account/force-logout';
      return;
    }
    // 403: Refresh超期，跳转会话过期页
    if (status === 403 && code === 'refresh_token_expired') {
      alert('登录已超最大时长，请重新登录。');
      await apiClient.post('/logout');
      window.location.href = '/account/session-expired';
      return;
    }
    return Promise.reject(err);
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

export const verify2FA = async (token: string) => {
  return apiClient.post('/2fa/verify', { token });
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

export default apiClient;