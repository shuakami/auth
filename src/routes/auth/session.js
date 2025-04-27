import express from 'express';
import * as RefreshTokenService from '../../services/refreshTokenService.js';

const router = express.Router();

/**
 * POST /logout
 * @tags 认证
 * @summary 用户登出
 * @description
 *   从Cookie获取Refresh Token，校验并吊销。
 *   吊销后，Access Token将失效，需要重新登录。
 * @param {LogoutRequestBody} request.body - 登出请求体
 * @return {SimpleSuccessResponse} 200 - 登出成功，Token已吊销
 */
router.post('/logout', async (req, res) => {
  // 从Cookie获取Refresh Token
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: '缺少Refresh Token' });
  }
  // 校验并吊销
  const { valid, dbToken } = await RefreshTokenService.validateRefreshToken(refreshToken);
  if (!valid) {
    return res.status(400).json({ error: '无效或已失效的Refresh Token' });
  }
  await RefreshTokenService.revokeRefreshTokenById(dbToken.id, '用户主动登出');
  // 清除Cookie
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ ok: true, message: '登出成功，Token已吊销' });
});

/**
 * POST /refresh
 * @tags 认证
 * @summary 刷新Access Token
 * @description
 *   从Cookie获取Refresh Token，校验并轮换。
 *   轮换后，Access Token将更新，Refresh Token保持不变。
 * @param {RefreshRequestBody} request.body - 刷新请求体
 * @return {RefreshSuccessResponse} 200 - 刷新成功，Access Token已更新
 */
router.post('/refresh', async (req, res) => {
  // 从Cookie获取Refresh Token
  const refreshToken = req.cookies.refreshToken;
  const deviceInfo = req.body.deviceInfo || req.headers['user-agent'] || '';
  if (!refreshToken) {
    return res.status(400).json({ error: '缺少Refresh Token' });
  }
  try {
    // 校验旧Token
    const { valid, dbToken, payload, reason } = await RefreshTokenService.validateRefreshToken(refreshToken);
    if (!valid) {
      // 针对不同reason返回不同错误码
      if (reason === 'Token超出最大生存期') {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(403).json({ error: 'Refresh Token超出最大生存期，请重新登录', code: 'refresh_token_expired' });
      }
      if (reason === 'Token已吊销' || reason === 'Token不存在' || reason === 'Token已过期' || reason === 'Token解密失败' || reason === 'Token不匹配') {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(401).json({ error: '无效或已失效的Refresh Token', code: 'refresh_token_invalid' });
      }
      return res.status(400).json({ error: reason || '无效的Refresh Token' });
    }
    // 检测Token被盗用（同一parentId下有多个有效Token）
    if (dbToken.parent_id) {
      const reused = await RefreshTokenService.detectTokenReuse(dbToken.parent_id);
      if (reused) {
        // 盗用，吊销所有相关Token并强制下线
        await RefreshTokenService.revokeAllRefreshTokensForUser(dbToken.user_id);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(403).json({ error: '检测到Refresh Token被盗用，已强制下线，请重新登录', code: 'refresh_token_compromised' });
      }
    }
    // 正常轮换
    const { token: newRefreshToken } = await RefreshTokenService.rotateRefreshToken(refreshToken, deviceInfo);
    const { signAccessToken } = await import('../../auth/jwt.js');
    const accessToken = signAccessToken({ uid: dbToken.user_id });
    // 解析exp
    const decoded = await import('jsonwebtoken').then(m => m.decode(accessToken));
    const exp = decoded && decoded.exp ? decoded.exp : Math.floor(Date.now() / 1000) + 600;
    // 用httpOnly Cookie下发新Token
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    // 响应体返回exp，便于前端Silent Refresh
    res.json({ ok: true, tokenType: 'Bearer', expiresIn: 600, exp });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误', detail: err?.message });
  }
});

export default router;
