/**
 * 验证用户名格式
 * 规则：
 * 1. 长度在 3-20 个字符之间
 * 2. 只能包含字母、数字、下划线和中文字符
 * 3. 不能以数字开头
 * @param {string} username 用户名
 * @returns {string|null} 错误信息，如果验证通过则返回 null
 */
export function validateUsername(username) {
  if (!username) return null; // 用户名是可选的
  
  if (username.length < 3 || username.length > 20) {
    return '用户名长度必须在 3-20 个字符之间';
  }

  // 不能以数字开头
  if (/^\d/.test(username)) {
    return '用户名不能以数字开头';
  }

  // 只允许字母、数字、下划线和中文字符
  if (!/^[\u4e00-\u9fa5a-zA-Z][a-zA-Z0-9_\u4e00-\u9fa5]*$/.test(username)) {
    return '用户名只能包含字母、数字、下划线和中文字符';
  }

  return null;
} 