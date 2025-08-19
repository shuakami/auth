import jwt from 'jsonwebtoken';
import fs from 'fs';
import { SESSION_SECRET, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH } from '../config/env.js';

// 优先从环境变量读取密钥，兼容Vercel Serverless
let privateKey = JWT_PRIVATE_KEY, publicKey = JWT_PUBLIC_KEY;
if (!privateKey || !publicKey) {
  try {
    privateKey = fs.readFileSync(JWT_PRIVATE_KEY_PATH, 'utf8');
    publicKey = fs.readFileSync(JWT_PUBLIC_KEY_PATH, 'utf8');
  } catch (e) {
    console.error('【JWT密钥加载失败】\n' +
      '请确保已配置JWT_PRIVATE_KEY/JWT_PUBLIC_KEY环境变量，或在本地生成密钥文件：\n' +
      'openssl genpkey -algorithm RSA -out config/jwtRS256.key -pkeyopt rsa_keygen_bits:2048\n' +
      'openssl rsa -pubout -in config/jwtRS256.key -out config/jwtRS256.key.pub\n' +
      '并将路径配置到.env或config/env.js。当前路径：', JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH);
    process.exit(1);
  }
}

// 生成一次性 Email 验证 Token（15 分钟，兼容第三方，仍用HS256）
export function signEmailToken(payload) {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
}

export function verifyEmailToken(token) {
  try {
    return jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

// 生成 Access Token（短生命周期，RS256）
export function signAccessToken(payload, expiresIn = '10m') {
  return jwt.sign(payload, privateKey, { expiresIn, algorithm: 'RS256' });
}

// 生成 ID Token（OIDC 规范，RS256）
export function signIdToken(payload, expiresIn = '1h') {
  return jwt.sign(payload, privateKey, { expiresIn, algorithm: 'RS256' });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

// 生成 Refresh Token（长生命周期，RS256）
export function signRefreshToken(payload) {
  return jwt.sign(payload, privateKey, { expiresIn: '15d', algorithm: 'RS256' });
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}
