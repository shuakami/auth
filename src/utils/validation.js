/**
 * 验证工具函数
 */

/**
 * 验证邮箱格式
 * @param {string} email 邮箱地址
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 验证用户名格式
 * @param {string} username 用户名
 * @returns {boolean}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  const cleanUsername = username.trim();
  
  // 长度检查
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return false;
  }
  
  // 字符检查：只允许字母、数字、下划线和短横线
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(cleanUsername);
}

/**
 * 验证URL格式
 * @param {string} url URL地址
 * @returns {boolean}
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证IP地址格式
 * @param {string} ip IP地址
 * @returns {boolean}
 */
export function validateIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  // IPv4 检查
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // IPv6 检查（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone 手机号
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * 验证身份证号格式（中国大陆）
 * @param {string} idCard 身份证号
 * @returns {boolean}
 */
export function validateIdCard(idCard) {
  if (!idCard || typeof idCard !== 'string') {
    return false;
  }
  
  const cleanIdCard = idCard.replace(/\s/g, '').toUpperCase();
  
  // 18位身份证号格式检查
  const idCardRegex = /^\d{17}[\dX]$/;
  return idCardRegex.test(cleanIdCard);
}

/**
 * 验证数字范围
 * @param {number} value 数值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {boolean}
 */
export function validateNumberRange(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  
  return value >= min && value <= max;
}

/**
 * 验证字符串长度
 * @param {string} str 字符串
 * @param {number} min 最小长度
 * @param {number} max 最大长度
 * @returns {boolean}
 */
export function validateStringLength(str, min, max) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  const length = str.trim().length;
  return length >= min && length <= max;
}

/**
 * 验证日期格式
 * @param {string} dateStr 日期字符串
 * @returns {boolean}
 */
export function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 验证UUID格式
 * @param {string} uuid UUID字符串
 * @returns {boolean}
 */
export function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}