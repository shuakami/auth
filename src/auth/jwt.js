import jwt from 'jsonwebtoken';
import { SESSION_SECRET } from '../config/env.js';

// 生成一次性 Email 验证 Token（15 分钟）
export function signEmailToken(payload) {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '15m' });
}

export function verifyEmailToken(token) {
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch {
    return null;
  }
}
