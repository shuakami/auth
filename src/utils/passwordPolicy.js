import zxcvbn from 'zxcvbn';

/**
 * 验证密码复杂度 (长度优先 + zxcvbn 强度)
 * @param {string} password - 用户输入的密码
 * @returns {string|null} - 如果密码不符合要求返回错误信息，否则返回null
 */
export function validatePassword(password) {
  // 1. 检查密码长度
  if (password.length < 10) {
    return '密码长度至少需要10个字符';
  }

  // 2. 使用 zxcvbn 评估密码强度
  const strength = zxcvbn(password);
  // 分数范围 0-4，0=太弱, 1=弱, 2=一般, 3=好, 4=强
  if (strength.score < 2) {
    let feedback = '密码太弱，请尝试更复杂的组合';
    if (strength.feedback && strength.feedback.warning) {
      feedback += ` (${strength.feedback.warning})`;
    } else if (strength.feedback && strength.feedback.suggestions && strength.feedback.suggestions.length > 0) {
      feedback += `: ${strength.feedback.suggestions.join(' ')}`;
    }
    return feedback;
  }

  // 3. 检查是否包含连续重复字符 (可选，但推荐)
  if (/(.)\1{2,}/.test(password)) {
    return '密码不能包含三个或以上连续重复的字符';
  }
  // 所有检查通过
  return null;
}

/**
 * 获取密码强度评估详细信息
 * @param {string} password - 待评估的密码
 * @returns {Object} - zxcvbn 评估结果
 */
export function getPasswordStrength(password) {
  return zxcvbn(password);
} 