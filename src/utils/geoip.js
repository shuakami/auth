import axios from 'axios';

// 简单内存缓存，key为ip，value为{data, expires}
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1小时

/**
 * 查询IP地理位置，自动缓存，失败时返回null
 * @param {string} ip
 * @returns {Promise<Object|null>} geo信息对象或null
 */
export async function getGeoInfo(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return null;
  const now = Date.now();
  const cached = cache.get(ip);
  if (cached && cached.expires > now) {
    return cached.data;
  }
  try {
    const res = await axios.get(`https://api.ip.sb/geoip/${ip}`);
    if (res.data) {
      const geo = {
        country: res.data.country,
        region: res.data.region,
        city: res.data.city,
        lat: res.data.latitude,
        lon: res.data.longitude,
        isp: res.data.org
      };
      cache.set(ip, { data: geo, expires: now + CACHE_TTL });
      return geo;
    }
  } catch (e) {
    // 查询失败，降级为null
  }
  return null;
} 