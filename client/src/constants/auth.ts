// 认证相关常量
export const AUTH_CONSTANTS = {
  // OAuth 窗口配置
  OAUTH_WINDOW: {
    WIDTH: 1000,
    HEIGHT: 700,
  },
  
  // 2FA 配置
  TWO_FA: {
    TOTP_LENGTH: 6,
    PATTERN: "\\d{6}",
  },
  
  // 路由路径
  ROUTES: {
    DASHBOARD: '/dashboard',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/login/forgot',
    GITHUB_OAUTH: '/api/github',
    GOOGLE_OAUTH: '/api/google',
  },
  
  // OAuth 消息类型
  OAUTH_MESSAGES: {
    GITHUB_LOGIN_SUCCESS: 'github-login-success',
    GITHUB_2FA_SUCCESS: 'github-2fa-success',
    GOOGLE_LOGIN_SUCCESS: 'google-login-success',
  },
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
  UNKNOWN_ERROR: '发生未知错误，请稍后重试。',
  EMAIL_NOT_VERIFIED: '邮箱尚未验证，请检查您的邮箱并点击验证链接。',
  INVALID_CREDENTIALS: '邮箱或密码错误，请重新输入。',
  LOGIN_FAILED: '登录失败，请检查您的邮箱和密码。',
  LOGIN_SUCCESS_NO_USER: '登录成功，但无法获取用户信息，请稍后再试。',
  OAUTH_SUCCESS_NO_USER: '第三方登录成功，但无法获取用户信息。',
  TWO_FA_SUCCESS_NO_USER: '2FA验证成功，但无法获取用户信息。',
  TWO_FA_ERROR: '验证过程中发生错误，请稍后重试',
  TOTP_INVALID: '动态验证码错误或已失效',
  BACKUP_CODE_INVALID: '备份码错误或已被使用',
};

// 成功消息常量
export const SUCCESS_MESSAGES = {
  TWO_FA_VERIFICATION_SUCCESS: '验证成功，正在登录...',
} as const;

// 2FA 模式类型
export type TwoFAMode = 'totp' | 'backup';

// 消息类型
export type MessageType = 'error' | 'info';