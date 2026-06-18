import express from 'express';
import * as RefreshTokenService from '../../services/refreshTokenService.js';
import { ensureAuth } from '../../middlewares/authenticated.js';
import { smartQuery, smartConnect } from '../../db/index.js';
import { signAccessToken } from '../../auth/jwt.js';
import { NODE_ENV } from '../../config/env.js';

const router = express.Router();

// 轻量级日志控制，与 Token 服务保持一致（受 LOG_LEVEL 控制）
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };
function log(level, ...args) {
  if ((LOG_ORDER[level] || 999) >= (LOG_ORDER[LOG_LEVEL] || 20)) {
    // eslint-disable-next-line no-console
    console[level](...args);
  }
}

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
  // 为了确保 Cookie 能被正确清除，必须使用与设置时完全一致的选项
  const isProduction = NODE_ENV === 'production';
  const clearOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
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
  const deviceInfo = req.body?.deviceInfo || req.headers['user-agent'] || '';
  log('info', `[Session] 收到 Cookie 会话 /refresh 请求 device=${deviceInfo ? deviceInfo.slice(0, 60) : 'unknown'} hasCookie=${Boolean(refreshToken)}`);
  if (!refreshToken || refreshToken === 'undefined' || refreshToken === undefined) {
    log('warn', '[Session] /refresh 缺少 refreshToken cookie，清除 Cookie 并要求重新登录');
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return res.status(401).json({ error: '无效的Token格式，请重新登录', code: 'refresh_token_missing' });
  }
  try {
    // 校验旧Token
    const { valid, dbToken, payload, reason } = await RefreshTokenService.validateRefreshToken(refreshToken);
    log(
      'debug',
      `[Session] /refresh 校验结果: valid=${valid} revoked=${dbToken?.revoked ?? 'n/a'} reason=${reason || 'none'} tokenId=${dbToken?.id || 'n/a'}`
    );

    // 已吊销的令牌通常是同一刷新令牌的并发/重试轮换（多标签页、静默刷新）：旧令牌
    // 刚被另一个请求轮换掉。此时不立即退登，交给 rotateRefreshToken 在宽限窗口内幂等
    // 返回已生成的替代令牌。只有真正终态失效（不存在/超龄/解密失败/格式错误）才清除
    // Cookie 并要求重新登录。此前的实现会在这里直接 401 退登，是 Cookie 会话（含 Passkey
    // 登录）「续期老是被退登」的根因——与 OAuth /token 路径不一致地缺少宽限处理。
    if (!valid && !(dbToken && dbToken.revoked)) {
      log('warn', `[Session] /refresh 终态失效，清除 Cookie 并要求重新登录 reason=${reason || 'unknown'}`);
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      if (reason === 'Token超出最大生存期') {
        return res.status(403).json({ error: 'Refresh Token超出最大生存期，请重新登录', code: 'refresh_token_expired' });
      }
      if (reason === 'Token不存在' || reason === 'Token已过期' || reason === 'Token解密失败' || reason === 'Token不匹配' || reason === '无效的Token格式') {
        return res.status(401).json({ error: '无效或已失效的Refresh Token', code: 'refresh_token_invalid' });
      }
      return res.status(400).json({ error: reason || '无效的Refresh Token' });
    }

    // 轮换刷新令牌。rotateRefreshToken 对并发/重试具备幂等性：宽限窗口内返回已生成的
    // 替代令牌；只有窗口外的过期重放才会吊销整个令牌家族并抛出 invalid_grant——那才是
    // 真正的重放/盗用信号，此时才强制下线。把重放检测统一交给轮换链处理，避免之前基于
    // 「同一 parentId 下多活跃子令牌」的提前判定在并发刷新下误伤。
    let newRefreshToken;
    try {
      ({ token: newRefreshToken } = await RefreshTokenService.rotateRefreshToken(refreshToken, deviceInfo));
    } catch (rotateErr) {
      const msg = rotateErr?.message || '';
      log('warn', `[Session] /refresh 轮换失败 reason=${msg}`);
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      if (msg.includes('重放') || msg.includes('盗用')) {
        return res.status(403).json({ error: '检测到Refresh Token被盗用，已强制下线，请重新登录', code: 'refresh_token_compromised' });
      }
      return res.status(401).json({ error: '无效或已失效的Refresh Token', code: 'refresh_token_invalid' });
    }

    const userId = dbToken?.user_id || payload?.uid;
    if (!userId) {
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ error: '无效或已失效的Refresh Token', code: 'refresh_token_invalid' });
    }
    const accessToken = signAccessToken({ uid: userId });
    
    // 验证生成的token有效性
    if (!newRefreshToken || typeof newRefreshToken !== 'string' || newRefreshToken === 'undefined') {
      console.error('[Session] Invalid newRefreshToken:', newRefreshToken);
      return res.status(500).json({ error: 'Token轮换失败', code: 'token_generation_error' });
    }
    
    if (!accessToken || typeof accessToken !== 'string' || accessToken === 'undefined') {
      console.error('[Session] Invalid accessToken:', accessToken);
      return res.status(500).json({ error: 'Token生成失败', code: 'token_generation_error' });
    }
    
    // 解析exp
    const decoded = await import('jsonwebtoken').then(m => m.decode(accessToken));
    const exp = decoded && decoded.exp ? decoded.exp : Math.floor(Date.now() / 1000) + 1800; // 30分钟 = 1800秒
    
    const isProduction = NODE_ENV === 'production';
    // 用httpOnly Cookie下发新Token（30分钟，与JWT过期时间匹配）
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/', // 确保cookie在整个域名下都可用
      maxAge: 30 * 60 * 1000
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/', // 确保cookie在整个域名下都可用
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    log('info', `[Session] Cookie 会话续期成功 user=${userId} accessExp=${exp} 已下发新 accessToken/refreshToken cookie`);
    // 响应体返回exp，便于前端Silent Refresh
    res.json({ ok: true, tokenType: 'Bearer', expiresIn: 1800, exp }); // 30分钟 = 1800秒
  } catch (err) {
    log('error', '[Session] /refresh 未预期错误:', err);
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
