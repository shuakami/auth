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
function getClientIp(req) {
  // 优先 x-forwarded-for，过滤内网/本地回环
  let ip = '';
  if (req.headers['x-forwarded-for']) {
    const ips = req.headers['x-forwarded-for'].split(',').map(s => s.trim());
    ip = ips.find(ip => ip && !/^127\.|^::1|^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip));
  }
  if (!ip && req.headers['x-real-ip']) ip = req.headers['x-real-ip'];
  if (!ip && req.ip) ip = req.ip;
  if (!ip && req.connection?.remoteAddress) ip = req.connection.remoteAddress;
  return ip || '';
}

export async function recordLoginLog({ req, user, success, reason, location, fingerprint }) {
  try {
    const ip = getClientIp(req);
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