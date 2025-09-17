/**
 * Google OAuth服务
 */

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../../../config/env.js';
import { OAuthServiceBase } from './OAuthServiceBase.js';

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES_GET = 2;
const GOOGLE_API_BASE = 'https://www.googleapis.com';

function createTimeoutSignal(parentSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(new Error('RequestTimeout')), timeoutMs);
  if (parentSignal) {
    parentSignal.addEventListener('abort', () => controller.abort(parentSignal.reason), { once: true });
  }
  return { signal: controller.signal, cancel: () => clearTimeout(tid) };
}

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
        let body;
        try { body = text ? JSON.parse(text) : null; } catch { body = text || null; }
        const err = new Error(`HTTP ${res.status} ${res.statusText}`);
        err.status = res.status;
        err.body = body;
        throw err;
      }

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
      const isNetwork = err && !('status' in err);
      const is5xx = err?.status >= 500;

      const retriable = isIdempotentGet && (isTimeout || isNetwork || is5xx);
      if (!retriable || attempt === retries) {
        throw err;
      }
      const backoff = Math.min(100 * Math.pow(2, attempt), 600) + Math.floor(Math.random() * 50);
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }

  throw lastErr;
}

export class GoogleOAuthService extends OAuthServiceBase {
  constructor() {
    super({
      providerName: 'google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      apiBaseUrl: GOOGLE_API_BASE
    });
  }

  /**
   * 获取Google授权参数（保持不变）
   * @returns {{ client_id: string, response_type: string, scope: string }}
   */
  getAuthParams() {
    return {
      client_id: GOOGLE_CLIENT_ID,
      response_type: 'code',
      scope: 'profile email'
    };
  }

  /**
   * 交换授权码获取Google访问令牌（表单编码、超时控制）
   * @param {string} code 授权码
   * @returns {Promise<string>} 访问令牌
   */
  async exchangeCodeForToken(code) {
    const form = new URLSearchParams();
    form.set('client_id', GOOGLE_CLIENT_ID);
    form.set('client_secret', GOOGLE_CLIENT_SECRET);
    form.set('code', code);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', this.getRedirectUri());

    const { data } = await fetchJson(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    }, { timeoutMs: DEFAULT_TIMEOUT_MS });

    if (!data || !data.access_token) {
      const reason = data?.error || 'unknown_error';
      throw new Error(`Google令牌获取失败: ${reason}`);
    }

    return data.access_token;
  }

  /**
   * 获取Google用户信息
   * @param {string} accessToken 访问令牌
   * @returns {Promise<any>} Google用户信息
   */
  async getUserInfo(accessToken) {
    const { data } = await fetchJson(
      `${this.config.apiBaseUrl}/oauth2/v2/userinfo`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, 'Accept': 'application/json' }
      },
      { timeoutMs: DEFAULT_TIMEOUT_MS }
    );

    return data;
  }

  /**
   * 标准化Google用户信息（保持逻辑不变）
   * @param {Object} rawUserInfo Google原始用户信息
   * @returns {Object} 标准化的用户信息
   */
  normalizeUserInfo(rawUserInfo) {
    const googleId = rawUserInfo?.id;
    let email = rawUserInfo?.email;

    if (!email) {
      email = `${googleId}@users.noreply.google.com`;
    }

    return {
      id: googleId,
      email,
      username: rawUserInfo?.email?.split('@')[0],
      name: rawUserInfo?.name,
      firstName: rawUserInfo?.given_name,
      lastName: rawUserInfo?.family_name,
      avatarUrl: rawUserInfo?.picture,
      provider: 'google',
      providerAccountId: String(googleId),
      raw: rawUserInfo
    };
  }
}
