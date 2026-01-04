import axios from 'axios';

// 简单内存缓存，key为ip，value为{data, expires}
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1小时

/**
 * 查询IP地理位置，自动缓存，失败时返回null
 * 使用 uapis.cn 的IP查询API
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
    // 使用 uapis.cn 的商业级IP查询API
    const res = await axios.get(`https://uapis.cn/api/v1/network/ipinfo`, {
      params: {
        ip: ip,
        source: 'commercial'
      }
    });
    
    // API 直接返回数据对象，检查是否有 region 字段
    if (res.data && res.data.region) {
      // 解析完整的地理位置字符串，格式：国家 省份/州 城市
      const regionParts = res.data.region?.split(' ') || [];
      const geo = {
        country: regionParts[0] || '',
        region: regionParts[1] || '',
        city: regionParts[2] || regionParts[1] || '', // 如果没有第3部分，使用第2部分
        lat: res.data.latitude,
        lon: res.data.longitude,
        isp: res.data.isp || res.data.llc,
        timeZone: res.data.time_zone || null,
        district: res.data.district || null
      };
      cache.set(ip, { data: geo, expires: now + CACHE_TTL });
      return geo;
    }
  } catch (e) {
    // 商业级API失败，尝试标准API
    try {
      const res = await axios.get(`https://uapis.cn/api/v1/network/ipinfo`, {
        params: {
          ip: ip
          // 不设置source参数，使用标准API
        }
      });
      
      // API 直接返回数据对象，检查是否有 region 字段
      if (res.data && res.data.region) {
        // 解析完整的地理位置字符串，格式：国家 省份/州 城市
        const regionParts = res.data.region?.split(' ') || [];
        const geo = {
          country: regionParts[0] || '',
          region: regionParts[1] || '',
          city: regionParts[2] || regionParts[1] || '', // 如果没有第3部分，使用第2部分
          lat: res.data.latitude,
          lon: res.data.longitude,
          isp: res.data.isp || res.data.llc
        };
        cache.set(ip, { data: geo, expires: now + CACHE_TTL });
        return geo;
      }
    } catch (e2) {
      // 查询失败，降级为null
      console.warn('IP地理位置查询失败:', e2.message);
    }
  }
  return null;
} 