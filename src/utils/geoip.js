import axios from 'axios';

// 简单内存缓存，key为ip，value为{data, expires}
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1小时

/**
 * 查询IP地理位置，自动缓存，失败时返回null
 * 使用多个备选API，优先使用国内精准API
 * @param {string} ip
 * @returns {Promise<Object|null>} geo信息对象或null
 */
export async function getGeoInfo(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') {
    console.log('[GeoIP] 跳过内网IP:', ip);
    return null;
  }
  const now = Date.now();
  const cached = cache.get(ip);
  if (cached && cached.expires > now) {
    console.log('[GeoIP] 使用缓存:', ip);
    return cached.data;
  }

  console.log('[GeoIP] 查询IP:', ip);

  // 定义多个备选API，uapis.cn 优先
  const apis = [
    // 1. uapis.cn 商业API - 国内精准，优先级最高
    async () => {
      const res = await axios.get(`https://uapis.cn/api/v1/network/ipinfo`, {
        params: { ip, source: 'commercial' },
        timeout: 3000
      });
      if (res.data?.region) {
        const regionParts = res.data.region?.split(' ') || [];
        return {
          country: regionParts[0] || '',
          region: regionParts[1] || '',
          city: regionParts[2] || regionParts[1] || '',
          lat: res.data.latitude,
          lon: res.data.longitude,
          isp: res.data.isp || res.data.llc || '',
          timeZone: res.data.time_zone || null
        };
      }
      return null;
    },

    // 2. ip-api.com - 免费，国内外都精准，每分钟45次限制
    async () => {
      const res = await axios.get(`http://ip-api.com/json/${ip}`, {
        params: { fields: 'status,country,regionName,city,lat,lon,isp,timezone' },
        timeout: 3000
      });
      if (res.data?.status === 'success') {
        return {
          country: res.data.country || '',
          region: res.data.regionName || '',
          city: res.data.city || '',
          lat: res.data.lat,
          lon: res.data.lon,
          isp: res.data.isp || '',
          timeZone: res.data.timezone || null
        };
      }
      return null;
    },

    // 3. ipapi.co - 免费，每天1000次
    async () => {
      const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
      if (res.data && !res.data.error) {
        return {
          country: res.data.country_name || '',
          region: res.data.region || '',
          city: res.data.city || '',
          lat: res.data.latitude,
          lon: res.data.longitude,
          isp: res.data.org || '',
          timeZone: res.data.timezone || null
        };
      }
      return null;
    },

    // 4. ipwho.is - 免费，无限制
    async () => {
      const res = await axios.get(`https://ipwho.is/${ip}`, { timeout: 3000 });
      if (res.data?.success) {
        return {
          country: res.data.country || '',
          region: res.data.region || '',
          city: res.data.city || '',
          lat: res.data.latitude,
          lon: res.data.longitude,
          isp: res.data.connection?.isp || '',
          timeZone: res.data.timezone?.id || null
        };
      }
      return null;
    },

    // 5. ip.sb - 简单备选
    async () => {
      const res = await axios.get(`https://api.ip.sb/geoip/${ip}`, { timeout: 3000 });
      if (res.data) {
        return {
          country: res.data.country || '',
          region: res.data.region || '',
          city: res.data.city || '',
          lat: res.data.latitude,
          lon: res.data.longitude,
          isp: res.data.isp || res.data.organization || '',
          timeZone: res.data.timezone || null
        };
      }
      return null;
    }
  ];

  // 依次尝试每个API
  for (let i = 0; i < apis.length; i++) {
    try {
      const geo = await apis[i]();
      if (geo && (geo.country || geo.city)) {
        cache.set(ip, { data: geo, expires: now + CACHE_TTL });
        console.log(`[GeoIP] API ${i + 1} 查询成功:`, JSON.stringify(geo));
        return geo;
      }
    } catch (e) {
      console.warn(`[GeoIP] API ${i + 1} 失败:`, e.message);
    }
  }

  console.warn('[GeoIP] 所有API都失败');
  return null;
}
