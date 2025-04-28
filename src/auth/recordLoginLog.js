import * as loginHistoryService from '../services/loginHistoryService.js';

/**
 * 统一记录登录历史（成功/失败均可）
 * @param {Object} params
 * @param {Object} params.req - Express请求对象
 * @param {Object|null} params.user - 用户对象，需包含id，可为null
 * @param {boolean} params.success - 是否登录成功
 * @param {string} [params.reason] - 失败原因（可选，成功时可省略）
 * @param {Object} [params.location] - 地理位置（可选）
 * @param {string} [params.fingerprint] - 指纹（可选，优先req.body.fingerprint）
 */
export async function recordLoginLog({ req, user, success, reason, location, fingerprint }) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const fp = fingerprint || req.body.fingerprint || '';
    await loginHistoryService.recordLogin({
      userId: user?.id || null,
      ip,
      fingerprint: fp,
      userAgent,
      location,
      success,
      failReason: reason
    });
  } catch (e) {
    console.error(`记录登录历史失败（${reason || (success ? '成功' : '失败')}）`, e);
  }
} 