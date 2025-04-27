import { v4 as uuidv4 } from 'uuid';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_BASE_URL } from '../config/env.js';
import * as User from '../services/userService.js';
import { signAccessToken, signRefreshToken } from './jwt.js';
import * as RefreshTokenService from '../services/refreshTokenService.js';
import express from 'express';
import axios from 'axios';
import { verifyTotp } from './totp.js';
import { decrypt } from './cryptoUtils.js';
import { verifyBackupCode } from './backupCodes.js';

const router = express.Router();

// 生产环境：OAuth回调严格支持2FA

// GitHub OAuth2
router.get('/github', (req, res) => {
  const state = uuidv4();
  const redirectUri = `${PUBLIC_BASE_URL}/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
  res.redirect(url);
});

router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('缺少code');
  try {
    // 获取access_token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${PUBLIC_BASE_URL}/auth/github/callback`
    }, { headers: { Accept: 'application/json' } });
    const accessToken = tokenRes.data.access_token;
    if (!accessToken) return res.status(400).send('GitHub授权失败');
    // 获取用户信息
    const userRes = await axios.get('https://api.github.com/user', { headers: { Authorization: `token ${accessToken}` } });
    const emailsRes = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: `token ${accessToken}` } });
    const githubId = userRes.data.id;
    let email = emailsRes.data.find(e => e.primary && e.verified)?.email || emailsRes.data.find(e => e.verified)?.email || emailsRes.data[0]?.email;
    if (!email) email = `${githubId}@users.noreply.github.com`;
    // 账号绑定/合并逻辑同原有
    let userByGithub = await User.findByGithubId(githubId);
    let userByEmail = await User.findByEmail(email);
    if (userByEmail && !userByEmail.github_id) {
      await User.bindGithubId(userByEmail.id, githubId);
      userByEmail.github_id = githubId;
    }
    if (userByGithub && userByEmail && userByGithub.id !== userByEmail.id) {
      if (userByGithub.password_hash && !userByEmail.password_hash) {
        await User.migratePasswordHash(userByEmail.id, userByGithub.password_hash);
      }
      userByGithub = null;
      userByEmail = await User.findByEmail(email);
    }
    let user = userByGithub || userByEmail;
    if (!user) {
      const id = uuidv4();
      await User.createUser({ id, email, githubId, verified: true });
      user = await User.findByEmail(email);
    }
    // 检查2FA状态
    if (user.totp_enabled) {
      // 生成短时效2FA临时Token（仅用于2FA验证，2分钟有效）
      const temp2FAToken = signAccessToken({ uid: user.id, type: '2fa_challenge', provider: 'github' });
      // 重定向到前端2FA页面，带临时Token
      return res.redirect(`${PUBLIC_BASE_URL}/2fa-required?token=${temp2FAToken}`);
    }
    // 未开启2FA，直接签发正式Token
    const accessTokenJwt = signAccessToken({ uid: user.id });
    const { token: refreshTokenJwt } = await RefreshTokenService.createRefreshToken(user.id, 'github-oauth', null);
    // 用httpOnly Cookie下发Token
    res.cookie('accessToken', accessTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000
    });
    res.cookie('refreshToken', refreshTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    // 重定向到前端成功页，不带Token
    return res.redirect(`${PUBLIC_BASE_URL}/oauth-success`);
  } catch (err) {
    console.error('GitHub OAuth回调失败:', err);
    res.status(500).send('GitHub OAuth回调失败');
  }
});

// Google OAuth2
router.get('/google', (req, res) => {
  const state = uuidv4();
  const redirectUri = `${PUBLIC_BASE_URL}/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email&state=${state}`;
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('缺少code');
  try {
    // 获取access_token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${PUBLIC_BASE_URL}/auth/google/callback`
    });
    const accessToken = tokenRes.data.access_token;
    if (!accessToken) return res.status(400).send('Google授权失败');
    // 获取用户信息
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const googleId = userRes.data.id;
    let email = userRes.data.email;
    if (!email) email = `${googleId}@users.noreply.google.com`;
    let userByGoogle = await User.findByGoogleId(googleId);
    let userByEmail = await User.findByEmail(email);
    if (userByEmail && !userByEmail.google_id) {
      await User.bindGoogleId(userByEmail.id, googleId);
      userByEmail.google_id = googleId;
    }
    if (userByGoogle && userByEmail && userByGoogle.id !== userByEmail.id) {
      if (userByGoogle.password_hash && !userByEmail.password_hash) {
        await User.migratePasswordHash(userByEmail.id, userByGoogle.password_hash);
      }
      userByGoogle = null;
      userByEmail = await User.findByEmail(email);
    }
    let user = userByGoogle || userByEmail;
    if (!user) {
      const id = uuidv4();
      await User.createUser({ id, email, googleId, verified: true });
      user = await User.findByEmail(email);
    }
    // 检查2FA状态
    if (user.totp_enabled) {
      const temp2FAToken = signAccessToken({ uid: user.id, type: '2fa_challenge', provider: 'google' });
      return res.redirect(`${PUBLIC_BASE_URL}/2fa-required?token=${temp2FAToken}`);
    }
    const accessTokenJwt = signAccessToken({ uid: user.id });
    const { token: refreshTokenJwt } = await RefreshTokenService.createRefreshToken(user.id, 'google-oauth', null);
    res.cookie('accessToken', accessTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000
    });
    res.cookie('refreshToken', refreshTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    return res.redirect(`${PUBLIC_BASE_URL}/oauth-success`);
  } catch (err) {
    console.error('Google OAuth回调失败:', err);
    res.status(500).send('Google OAuth回调失败');
  }
});

// 2FA验证API：前端提交TOTP/备份码+临时Token，校验通过后签发正式Token
router.post('/2fa/verify', async (req, res) => {
  try {
    const { token, totp, backupCode } = req.body;
    if (!token) return res.status(400).json({ error: '缺少2FA临时Token' });
    const payload = signAccessToken.verifyAccessToken ? signAccessToken.verifyAccessToken(token) : null;
    // 兼容性处理
    const verifyAccessToken = require('./jwt.js').verifyAccessToken;
    const realPayload = verifyAccessToken(token);
    if (!realPayload || !realPayload.uid || realPayload.type !== '2fa_challenge') {
      return res.status(401).json({ error: '无效或过期的2FA临时Token' });
    }
    const user = await User.findById(realPayload.uid);
    if (!user || !user.totp_enabled) {
      return res.status(401).json({ error: '用户未开启2FA' });
    }
    // 校验TOTP或备份码
    let ok = false;
    if (totp) {
      const encryptedSecret = user.totp_secret;
      if (!encryptedSecret) return res.status(400).json({ error: '2FA密钥缺失' });
      const decryptedSecret = decrypt(encryptedSecret);
      if (!decryptedSecret) return res.status(500).json({ error: '2FA密钥解密失败' });
      ok = verifyTotp(decryptedSecret, totp);
    } else if (backupCode) {
      ok = await verifyBackupCode(user.id, backupCode);
    }
    if (!ok) return res.status(401).json({ error: '2FA验证码或备份码无效' });
    // 校验通过，签发正式Token
    const accessTokenJwt = signAccessToken({ uid: user.id });
    const { token: refreshTokenJwt } = await RefreshTokenService.createRefreshToken(user.id, 'oauth-2fa', null);
    res.cookie('accessToken', accessTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000
    });
    res.cookie('refreshToken', refreshTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    // 响应体不再返回Token字段
    res.json({ ok: true, tokenType: 'Bearer', expiresIn: 600 });
  } catch (err) {
    console.error('2FA验证失败:', err);
    res.status(500).json({ error: '2FA验证失败' });
  }
});

export default router;
