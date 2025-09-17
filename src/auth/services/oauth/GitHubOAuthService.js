/**
 * GitHub OAuth服务
 */

import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '../../../config/env.js';
import { OAuthServiceBase } from './OAuthServiceBase.js';

/** ===== 内部通用配置（不改变对外接口与逻辑） ===== */
const DEFAULT_TIMEOUT_MS = 8000;      // 每个请求的硬超时
const MAX_RETRIES_GET = 2;            // 幂等 GET 的额外重试次数（总尝试 = 1 + MAX_RETRIES_GET）
const GH_API_BASE = 'https://api.github.com';

/**
 * 生成带超时的 AbortSignal
 * @param {AbortSignal|undefined} parentSignal
 * @param {number} timeoutMs
 */
function createTimeoutSignal(parentSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(new Error('RequestTimeout')), timeoutMs);
  if (parentSignal) {
    parentSignal.addEventListener('abort', () => controller.abort(parentSignal.reason), { once: true });
  }
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(tid)
  };
}

/**
 * 统一的 fetch JSON 工具：状态码校验、JSON 解析、幂等 GET 的有限重试
 * @param {string} url
 * @param {RequestInit} options
 * @param {{ timeoutMs?: number, retries?: number }} control
 * @returns {Promise<{ data: any, res: Response }>}
 */
async function fetchJson(url, options = {}, control = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isIdempotentGet = method === 'GET';
  const retries = isIdempotentGet ? (control.retries ?? MAX_RETRIES_GET) : 0;
  const timeoutMs = control.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let attempt = 0;
  let lastErr;

  while (attempt <= retries) {
    const { signal, cancel } = createTimeoutSignal(options.signal, timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal });
      const text = await res.text().catch(() => '');

      if (!res.ok) {
        // 尝试解析 JSON 错误体
        let body;
        try { body = text ? JSON.parse(text) : null; } catch { body = text || null; }
        const err = new Error(`HTTP ${res.status} ${res.statusText}`);
        err.status = res.status;
        err.body = body;
        throw err;
      }

      // 正常 JSON 解析
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch (e) {
          const err = new Error('InvalidJSON');
          err.cause = e;
          throw err;
        }
      }
      cancel();
      return { data, res };
    } catch (err) {
      cancel();
      lastErr = err;

      const isTimeout = err?.name === 'AbortError' || (err?.message || '').includes('RequestTimeout');
      const isNetwork = err && !('status' in err); // fetch 网络错误通常没有 status
      const is5xx = err?.status >= 500;

      const retriable = isIdempotentGet && (isTimeout || isNetwork || is5xx);
      if (!retriable || attempt === retries) {
        throw err;
      }
      // 指数退避 + 抖动（上限 600ms），避免惊群与放大
      const backoff = Math.min(100 * Math.pow(2, attempt), 600) + Math.floor(Math.random() * 50);
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }

  throw lastErr;
}

export class GitHubOAuthService extends OAuthServiceBase {
  constructor() {
    super({
      providerName: 'github',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      apiBaseUrl: GH_API_BASE
    });
  }

  /**
   * 获取GitHub授权参数（保持不变）
   * @returns {{ client_id: string, scope: string }}
   */
  getAuthParams() {
    return {
      client_id: GITHUB_CLIENT_ID,
      scope: 'user:email'
    };
  }

  /**
   * 交换授权码获取GitHub访问令牌（表单编码、超时控制）
   * @param {string} code 授权码
   * @returns {Promise<string>} 访问令牌
   */
  async exchangeCodeForToken(code) {
    const redirectUri = this.getRedirectUri();

    const form = new URLSearchParams();
    form.set('client_id', GITHUB_CLIENT_ID);
    form.set('client_secret', GITHUB_CLIENT_SECRET);
    form.set('code', code);
    form.set('redirect_uri', redirectUri);

    const { data } = await fetchJson(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        // GitHub 建议设置 UA；这里使用通用 UA，避免暴露内部信息
        'User-Agent': 'oauth-service/1.0'
      },
      body: form.toString()
    }, { timeoutMs: DEFAULT_TIMEOUT_MS });

    if (!data || data.error || !data.access_token) {
      const reason = data?.error || 'unknown_error';
      throw new Error(`GitHub令牌获取失败: ${reason}`);
    }

    return data.access_token;
  }

  /**
   * 获取 GitHub 用户信息（并发 + 超时 + 有限重试）
   * @param {string} accessToken 访问令牌
   * @returns {Promise<{ user: any, emails: any[] }>}
   */
  async getUserInfo(accessToken) {
    const headers = {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'oauth-service/1.0'
      // 可按需固定 API 版本以保证响应稳定性：
      // 'X-GitHub-Api-Version': '2022-11-28'
    };

    const userReq = fetchJson(`${this.config.apiBaseUrl}/user`, { headers, method: 'GET' });
    const emailReq = fetchJson(`${this.config.apiBaseUrl}/user/emails`, { headers, method: 'GET' });

    const [{ data: user }, { data: emails }] = await Promise.all([userReq, emailReq]);

    return { user, emails: Array.isArray(emails) ? emails : [] };
  }

  /**
   * 标准化 GitHub 用户信息（保持逻辑不变）
   * @param {{ user: any, emails: any[] }} rawUserInfo
   * @returns {Object}
   */
  normalizeUserInfo(rawUserInfo) {
    const { user, emails } = rawUserInfo;
    const githubId = user?.id;

    // 优先选择主要且已验证的邮箱；其次任一已验证；再退化到第一个；最后使用 noreply
    let email =
      emails.find(e => e?.primary && e?.verified)?.email
      || emails.find(e => e?.verified)?.email
      || emails[0]?.email;

    if (!email) {
      email = `${githubId}@users.noreply.github.com`;
    }

    return {
      id: githubId,
      email,
      username: user?.login,
      name: user?.name,
      avatarUrl: user?.avatar_url,
      provider: 'github',
      providerAccountId: String(githubId),
      raw: user
    };
  }

  /**
   * 按原有签名提供的高阶封装：交换 token 并返回标准化用户信息（逻辑等价）
   * @param {string} code
   * @param {string} state
   * @returns {Promise<Object>}
   */
  async getOAuthUserInfo(code, state) {
    try {
      const accessToken = await this.exchangeCodeForToken(code);
      if (!accessToken) {
        throw new Error(`${this.providerName}授权失败`);
      }
      const userInfo = await this.getUserInfo(accessToken);
      return this.normalizeUserInfo(userInfo);
    } catch (error) {
      // 统一错误出口，便于上层观测
      // 注意：不记录敏感 token
      console.error(`[OAuth] 获取 ${this.providerName} 用户信息失败:`, {
        message: error?.message,
        status: error?.status
      });
      throw error;
    }
  }
}
