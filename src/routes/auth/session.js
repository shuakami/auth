import express from 'express';
import * as RefreshTokenService from '../../services/refreshTokenService.js';
import { ensureAuth } from '../../middlewares/authenticated.js';
import { smartQuery, smartConnect } from '../../db/index.js';

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
    const exp = decoded && decoded.exp ? decoded.exp : Math.floor(Date.now() / 1000) + 1800; // 30分钟 = 1800秒
    // 用httpOnly Cookie下发新Token（30分钟，与JWT过期时间匹配）
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 60 * 1000
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    // 响应体返回exp，便于前端Silent Refresh
    res.json({ ok: true, tokenType: 'Bearer', expiresIn: 1800, exp }); // 30分钟 = 1800秒
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误', detail: err?.message });
  }
});

/**
 * GET /session/list
 * @tags 认证
 * @summary 获取当前用户所有活跃会话及聚合登录历史
 * @security bearerAuth
 * @return {SessionListResponse} 200 - 会话列表
 * @return {ErrorResponse} 401 - 未授权
 */
router.get('/session/list', ensureAuth, async (req, res) => {
  const userId = req.user.id;
  const currentRefreshToken = req.cookies.refreshToken; // 获取当前请求的 Refresh Token
  let currentSessionId = null;

  // 尝试验证当前 Refresh Token 并获取其 ID
  if (currentRefreshToken) {
    try {
      const { valid, dbToken } = await RefreshTokenService.validateRefreshToken(currentRefreshToken);
      if (valid) {
        currentSessionId = dbToken.id;
      }
    } catch (validationError) {
      // 验证失败（例如过期、吊销等），忽略错误，不标记任何会话为当前
      console.warn('Failed to validate current refresh token during session list:', validationError.message);
    }
  }

  try {
    const sessions = await RefreshTokenService.getSessionAggregatedInfoForUser(userId);
    // 为每个会话添加 isCurrent 标志，并脱敏处理
    const safeSessions = sessions.map(item => {
      const isCurrent = item.id === currentSessionId;
      return {
        ...item,
        isCurrent, // 添加 isCurrent 字段
        lastIp: item.lastIp ? item.lastIp.replace(/^(\d+\.\d+)\.(\d+)\.(\d+)$/, '$1.*.*') : '',
      }
    });
    res.json({ sessions: safeSessions });
  } catch (e) {
    // 添加详细错误日志
    console.error(`[ERROR] Failed to get sessions for user ${userId}:`, e);
    res.status(500).json({ error: '查询会话列表失败' });
  }
});

/**
 * DELETE /session/:id
 * @tags 认证
 * @summary 吊销指定会话（登出指定设备）
 * @security bearerAuth
 * @param {string} id.path.required - 要吊销的 Refresh Token ID
 * @return {SimpleSuccessResponse} 200 - 吊销成功
 * @return {ErrorResponse} 401 - 未授权
 * @return {ErrorResponse} 403 - 无权限操作该会话
 * @return {ErrorResponse} 404 - 会话不存在
 */
router.delete('/session/:id', ensureAuth, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.id;
  try {
    // 检查该会话是否存在且属于当前用户
    // 使用直接导入的 pool
    const { rows } = await smartQuery(
      `SELECT user_id FROM refresh_tokens WHERE id = $1`,
      [sessionId]
    );
    const session = rows[0];
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ error: '无权限操作该会话' });
    }
    // 调用 Service 函数吊销，这里仍然使用 Service
    await RefreshTokenService.revokeRefreshTokenById(sessionId, '用户远程登出');
    res.json({ ok: true, message: '会话已吊销' });
  } catch (e) {
    // 添加详细错误日志
    console.error(`[ERROR] Failed to revoke session ${sessionId} for user ${userId}:`, e);
    res.status(500).json({ error: '吊销会话失败' });
  }
});

export default router;
