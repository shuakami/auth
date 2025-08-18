/**
 * 第三方登录（OAuth）接口文档
 */

import express from 'express';
const router = express.Router();

/* ---------------------------------------------------------------------------
 *  认证 Authentication – 第三方登录
 * -------------------------------------------------------------------------*/

/* ---------------------------------------------------------------------------
 *  OAuth – GitHub
 * -------------------------------------------------------------------------*/

/**
 * GET /github
 * @tags OAuth
 * @summary 使用 GitHub 账号登录
 * @description 跳转到 GitHub OAuth 授权页面，用户授权后自动回调 /auth/github/callback。
 * @return 302 - 跳转到 GitHub 授权页面
 */

/**
 * GET /github/callback
 * @tags OAuth
 * @summary GitHub 登录回调
 * @description GitHub 授权后回调此接口，自动完成用户注册/登录。
 * @return {object} 200 - 登录成功
 *    - Cookie: accessToken (httpOnly, 10分钟)
 *    - Cookie: refreshToken (httpOnly, 30天)
 * @return {object} 302 - 需要2FA验证时重定向
 *    - Location: /2fa-required
 *    - Query: token (2FA临时Token，2分钟有效)
 * @return {ErrorResponse} 400 - 请求参数错误
 * @return {ErrorResponse} 500 - 服务器内部错误
 */

/* ---------------------------------------------------------------------------
 *  OAuth – Google
 * -------------------------------------------------------------------------*/

/**
 * GET /google
 * @tags OAuth
 * @summary 使用 Google 账号登录
 * @description 跳转到 Google OAuth 授权页面，用户授权后自动回调 /api/google/callback。
 * @return 302 - 跳转到 Google 授权页面
 */

/**
 * GET /google/callback
 * @tags OAuth
 * @summary Google 登录回调
 * @description Google 授权后回调此接口，自动完成用户注册/登录。
 * @return {object} 200 - 登录成功
 *    - Cookie: accessToken (httpOnly, 10分钟)
 *    - Cookie: refreshToken (httpOnly, 30天)
 * @return {object} 302 - 需要2FA验证时重定向
 *    - Location: /2fa-required
 *    - Query: token (2FA临时Token，2分钟有效)
 * @return {ErrorResponse} 400 - 请求参数错误
 * @return {ErrorResponse} 500 - 服务器内部错误
 */

/**
 * POST /2fa/verify
 * @tags OAuth
 * @summary 验证2FA
 * @description 验证2FA临时Token和TOTP/备份码
 * @param {object} request.body
 *    - token {string} 2FA临时Token
 *    - totp {string} TOTP验证码
 *    - backupCode {string} 备份码（与TOTP二选一）
 * @return {object} 200 - 验证成功
 *    - Cookie: accessToken (httpOnly, 10分钟)
 *    - Cookie: refreshToken (httpOnly, 30天)
 * @return {ErrorResponse} 400 - 请求参数错误
 * @return {ErrorResponse} 401 - 验证失败
 * @return {ErrorResponse} 500 - 服务器内部错误
 */

export default router;
