import * as loginHistoryService from '../services/loginHistoryService.js';

/**
 * 查询 IP 地理位置
 * @param {string} ip IP 地址
 * @returns {Promise<Object|null>} 位置信息
 */
async function queryIpLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null; // 内网 IP 不查询
  }
  
  try {
    const response = await fetch(`https://uapis.cn/api/v1/network/ipinfo?ip=${encodeURIComponent(ip)}&source=commercial`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      region: data.region || null,
      isp: data.isp || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      district: data.district || null,
      timeZone: data.time_zone || null,
    };
  } catch (error) {
    console.warn('[recordLoginLog] IP 地理位置查询失败:', error.message);
    return null;
  }
}

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
  // 优先 x-forwarded-for
  if (req.headers['x-forwarded-for']) {
    const ips = req.headers['x-forwarded-for'].split(',').map(s => s.trim());
    if (ips.length > 0 && ips[0]) return ips[0];
  }
  if (req.headers['x-real-ip']) return req.headers['x-real-ip'];
  if (req.ip) return req.ip;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  return '';
}

export async function recordLoginLog({ req, user, success, reason, location, fingerprint }) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const fp = fingerprint || req.body?.fingerprint || '';
    
    // 如果没有传入 location，尝试查询 IP 地理位置
    let finalLocation = location;
    if (!finalLocation && ip) {
      finalLocation = await queryIpLocation(ip);
    }
    
    await loginHistoryService.recordLogin({
      userId: user?.id || null,
      ip,
      fingerprint: fp,
      userAgent,
      location: finalLocation,
      success,
      failReason: reason
    });
  } catch (e) {
    console.error(`记录登录历史失败（${reason || (success ? '成功' : '失败')}）`, e);
  }
} 