/**
 * WebAuthn 生物验证路由
 * 处理生物验证的注册、验证和管理功能
 */
import express from 'express';
import { ensureAuth } from '../../middlewares/authenticated.js';
import { WebAuthnService } from '../../auth/services/WebAuthnService.js';
import { authLimiter } from '../../middlewares/rateLimit.js';
import * as WebAuthnCredential from '../../services/webauthnCredentialService.js';
import * as User from '../../services/userService.js';

const router = express.Router();
const webAuthnService = new WebAuthnService();

/* ---------------------------------------------------------------------------
 *  生物验证 WebAuthn
 * -------------------------------------------------------------------------*/

/**
 * POST /webauthn/registration/begin
 * @tags 生物验证
 * @summary 开始生物验证注册
 * @description 
 *   为当前登录用户生成 WebAuthn 注册选项。
 *   需要有效的 Access Token 才能访问。
 * @security bearerAuth
 * @return {WebAuthnRegistrationOptionsResponse} 200 - 成功获取注册选项 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Access Token） - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/webauthn/registration/begin', ensureAuth, async (req, res) => {
  try {
    const options = await webAuthnService.generateRegistrationOptions(req.user.id);
    res.json({
      ok: true,
      options,
    });
  } catch (error) {
    console.error('[WebAuthn Registration Begin] Error:', error);
    res.status(500).json({ 
      error: '生成注册选项失败',
      message: error.message 
    });
  }
});

/**
 * POST /webauthn/registration/finish
 * @tags 生物验证
 * @summary 完成生物验证注册
 * @description 
 *   (速率限制: **10次/分钟/IP**)
 * 
 *   验证客户端提供的 WebAuthn 注册响应，并保存凭据。
 *   需要有效的 Access Token 才能访问。
 * @security bearerAuth
 * @param {WebAuthnRegistrationFinishRequest} request.body - 注册完成数据
 * @return {WebAuthnRegistrationFinishResponse} 200 - 注册成功 - application/json
 * @return {ErrorResponse} 400 - 请求参数错误或验证失败 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Access Token） - application/json
 * @return {ErrorResponse} 429 - 请求过于频繁 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/webauthn/registration/finish', ensureAuth, authLimiter, async (req, res) => {
  try {
    const { response, credentialName } = req.body;

    if (!response) {
      return res.status(400).json({ error: '缺少注册响应数据' });
    }

    const result = await webAuthnService.verifyRegistrationResponse(
      req.user.id,
      response,
      credentialName
    );

    res.json({
      ok: true,
      message: '生物验证注册成功',
      credential: {
        id: result.credential.id,
        name: result.credential.name,
        deviceType: result.credential.credential_device_type,
        createdAt: result.credential.created_at,
      },
    });

  } catch (error) {
    console.error('[WebAuthn Registration Finish] Error:', error);
    res.status(400).json({ 
      error: '注册验证失败',
      message: error.message 
    });
  }
});

/**
 * POST /webauthn/authentication/begin
 * @tags 生物验证
 * @summary 开始生物验证认证
 * @description 
 *   生成 WebAuthn 认证选项。可以不提供用户信息进行无密码登录，
 *   或者提供用户ID进行针对性认证。
 * @param {WebAuthnAuthenticationBeginRequest} request.body - 认证开始数据（可选）
 * @return {WebAuthnAuthenticationOptionsResponse} 200 - 成功获取认证选项 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/webauthn/authentication/begin', async (req, res) => {
  try {
    const { userId } = req.body;
    const options = await webAuthnService.generateAuthenticationOptions(userId);
    
    res.json({
      ok: true,
      options,
    });

  } catch (error) {
    console.error('[WebAuthn Authentication Begin] Error:', error);
    res.status(500).json({ 
      error: '生成认证选项失败',
      message: error.message 
    });
  }
});

/**
 * POST /webauthn/authentication/finish
 * @tags 生物验证
 * @summary 完成生物验证认证
 * @description 
 *   (速率限制: **10次/分钟/IP**)
 * 
 *   验证客户端提供的 WebAuthn 认证响应。
 *   成功后返回用户信息和访问令牌，实现无密码登录。
 * @param {WebAuthnAuthenticationFinishRequest} request.body - 认证完成数据
 * @return {WebAuthnAuthenticationFinishResponse} 200 - 认证成功，返回用户信息和令牌 - application/json
 * @return {ErrorResponse} 400 - 请求参数错误或验证失败 - application/json
 * @return {ErrorResponse} 429 - 请求过于频繁 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.post('/webauthn/authentication/finish', authLimiter, async (req, res) => {
  try {
    const { response, userId } = req.body;

    if (!response) {
      return res.status(400).json({ error: '缺少认证响应数据' });
    }

    const result = await webAuthnService.verifyAuthenticationResponse(response, userId);

    if (!result.verified) {
      return res.status(400).json({ error: '生物验证失败' });
    }

    // 获取用户信息
    const user = await User.findById(result.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 生成访问令牌（这里需要引入现有的登录成功处理逻辑）
    const { signAccessToken } = await import('../../auth/jwt.js');
    const accessToken = signAccessToken({ id: user.id, email: user.email });

    // 创建刷新令牌
    const { createRefreshToken } = await import('../../services/refreshTokenService.js');
    const deviceInfo = req.headers['user-agent'] || 'WebAuthn Device';
    const refreshToken = await createRefreshToken(user.id, deviceInfo);

    // 设置刷新令牌 Cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    });

    // 记录登录日志
    const { recordLoginLog } = await import('../../auth/recordLoginLog.js');
    await recordLoginLog({
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      loginMethod: 'webauthn',
      deviceType: 'biometric',
    });

    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      ok: true,
      message: '生物验证登录成功',
      user: { ...userWithoutPassword, has_password: !!password_hash },
      accessToken,
      credential: {
        id: result.credentialId,
        name: result.credential.name,
        deviceType: result.credential.credential_device_type,
      },
    });

  } catch (error) {
    console.error('[WebAuthn Authentication Finish] Error:', error);
    res.status(400).json({ 
      error: '生物验证认证失败',
      message: error.message 
    });
  }
});

/**
 * GET /webauthn/credentials
 * @tags 生物验证
 * @summary 获取用户的生物验证凭据列表
 * @description 
 *   获取当前登录用户的所有已注册生物验证凭据。
 *   需要有效的 Access Token 才能访问。
 * @security bearerAuth
 * @return {WebAuthnCredentialsListResponse} 200 - 成功获取凭据列表 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Access Token） - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.get('/webauthn/credentials', ensureAuth, async (req, res) => {
  try {
    const credentials = await WebAuthnCredential.getCredentialsByUserId(req.user.id);
    
    const credentialList = credentials.map(cred => ({
      id: cred.id, // 数据库主键ID，用于删除操作
      credentialId: cred.credential_id, // WebAuthn凭据ID（hex格式）
      name: cred.name,
      deviceType: cred.credential_device_type,
      createdAt: cred.created_at,
      lastUsedAt: cred.last_used_at,
      backedUp: cred.credential_backed_up,
    }));

    res.json({
      ok: true,
      credentials: credentialList,
      count: credentialList.length,
    });

  } catch (error) {
    console.error('[WebAuthn Get Credentials] Error:', error);
    res.status(500).json({ 
      error: '获取凭据列表失败',
      message: error.message 
    });
  }
});

/**
 * PUT /webauthn/credentials/:credentialId/name
 * @tags 生物验证
 * @summary 更新生物验证凭据名称
 * @description 
 *   更新指定凭据的显示名称。
 *   需要有效的 Access Token 才能访问。
 * @security bearerAuth
 * @param {string} credentialId.path.required - 凭据ID
 * @param {WebAuthnUpdateCredentialNameRequest} request.body - 新名称
 * @return {SimpleSuccessResponse} 200 - 更新成功 - application/json
 * @return {ErrorResponse} 400 - 请求参数错误 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Access Token） - application/json
 * @return {ErrorResponse} 404 - 凭据不存在或不属于当前用户 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.put('/webauthn/credentials/:credentialId/name', ensureAuth, async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '凭据名称不能为空' });
    }

    const success = await WebAuthnCredential.updateCredentialNameById(
      credentialId,
      req.user.id,
      name.trim()
    );

    if (!success) {
      return res.status(404).json({ error: '凭据不存在或无权限修改' });
    }

    res.json({
      ok: true,
      message: '凭据名称更新成功',
    });

  } catch (error) {
    console.error('[WebAuthn Update Credential Name] Error:', error);
    res.status(500).json({ 
      error: '更新凭据名称失败',
      message: error.message 
    });
  }
});

/**
 * DELETE /webauthn/credentials/:credentialId
 * @tags 生物验证
 * @summary 删除生物验证凭据
 * @description 
 *   删除指定的生物验证凭据。
 *   需要有效的 Access Token 才能访问。
 * @security bearerAuth
 * @param {string} credentialId.path.required - 凭据ID
 * @return {SimpleSuccessResponse} 200 - 删除成功 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Access Token） - application/json
 * @return {ErrorResponse} 404 - 凭据不存在或不属于当前用户 - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.delete('/webauthn/credentials/:credentialId', ensureAuth, async (req, res) => {
  try {
    console.log(`[WebAuthn Delete] Received DELETE request for credential: ${req.params.credentialId}`);
    console.log(`[WebAuthn Delete] User ID: ${req.user.id}`);
    
    const { credentialId } = req.params;

    const success = await WebAuthnCredential.deleteCredentialById(credentialId, req.user.id);
    console.log(`[WebAuthn Delete] Delete operation result: ${success}`);

    if (!success) {
      return res.status(404).json({ error: '凭据不存在或无权限删除' });
    }

    res.json({
      ok: true,
      message: '凭据删除成功',
    });

  } catch (error) {
    console.error('[WebAuthn Delete Credential] Error:', error);
    res.status(500).json({ 
      error: '删除凭据失败',
      message: error.message 
    });
  }
});

/**
 * GET /webauthn/support
 * @tags 生物验证
 * @summary 检查生物验证支持状态
 * @description 
 *   检查当前用户的生物验证支持和启用状态。
 *   需要有效的 Access Token 才能访问。
 * @security bearerAuth
 * @return {WebAuthnSupportResponse} 200 - 成功获取支持状态 - application/json
 * @return {ErrorResponse} 401 - 未授权（无效或缺少 Access Token） - application/json
 * @return {ErrorResponse} 500 - 服务器内部错误 - application/json
 */
router.get('/webauthn/support', ensureAuth, async (req, res) => {
  try {
    const support = await webAuthnService.checkBiometricSupport(req.user.id);
    
    res.json({
      ok: true,
      ...support,
    });

  } catch (error) {
    console.error('[WebAuthn Check Support] Error:', error);
    res.status(500).json({ 
      error: '检查生物验证支持失败',
      message: error.message 
    });
  }
});

export default router;