import dotenv from 'dotenv';
dotenv.config();

export const {
  DATABASE_URL,
  DATABASE_SSL = 'true',
  SESSION_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  RESEND_API_KEY,
  MAIL_FROM,
  SUCCESS_REDIRECT = '/',
  PUBLIC_BASE_URL = 'http://localhost:3000',
  APP_KEY,
  COOKIE_DOMAIN
} = process.env;

if (!DATABASE_URL) throw new Error('缺少 DATABASE_URL');
if (!SESSION_SECRET) throw new Error('缺少 SESSION_SECRET');
if (!APP_KEY || APP_KEY.length !== 64 || !/^[0-9a-fA-F]+$/.test(APP_KEY)) {
  throw new Error('缺少或无效的 APP_KEY 环境变量，请确保其为 32 字节 (64 个十六进制字符)。');
}
