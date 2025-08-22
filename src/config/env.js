import dotenv from 'dotenv';
dotenv.config();

export const {
  DATABASE_URL,
  DATABASE_SSL = 'true',
  SESSION_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  RESEND_API_KEY,
  MAIL_FROM,
  SUCCESS_REDIRECT = '/',
  PUBLIC_BASE_URL = 'http://localhost:3000',
  APP_KEY,
  COOKIE_DOMAIN,
  TOTP_ISSUER,
  NODE_ENV,
  SUPER_ADMIN_ID
} = process.env;

if (!DATABASE_URL) throw new Error('缺少 DATABASE_URL');
if (!SESSION_SECRET) throw new Error('缺少 SESSION_SECRET');
if (!APP_KEY || APP_KEY.length !== 64 || !/^[0-9a-fA-F]+$/.test(APP_KEY)) {
  throw new Error('缺少或无效的 APP_KEY 环境变量，请确保其为 32 字节 (64 个十六进制字符)。');
}


// 两组（JWT_PRIVATE_KEY 和  JWT_PUBLIC_KEY 或者 JWT_PRIVATE_KEY_PATH 和 JWT_PUBLIC_KEY_PATH）至少一组存在 才可以继续跑
export const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
export const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
export const JWT_PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH || './config/jwtRS256.key';
export const JWT_PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH || './config/jwtRS256.key.pub';

if (!JWT_PRIVATE_KEY && !JWT_PRIVATE_KEY_PATH) throw new Error('缺少 JWT_PRIVATE_KEY 或 JWT_PRIVATE_KEY_PATH ');
if (!JWT_PUBLIC_KEY && !JWT_PUBLIC_KEY_PATH) throw new Error('缺少 JWT_PUBLIC_KEY 或 JWT_PUBLIC_KEY_PATH');
