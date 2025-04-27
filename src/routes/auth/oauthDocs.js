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
 * @description GitHub 授权后回调此接口，自动完成用户注册/登录，成功后重定向到前端页面（由 SUCCESS_REDIRECT 环境变量指定）。
 * @return 302 - 跳转到前端页面（登录成功）
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
 * @description Google 授权后回调此接口，自动完成用户注册/登录，成功后重定向到前端页面（由 SUCCESS_REDIRECT 环境变量指定）。
 * @return 302 - 跳转到前端页面（登录成功）
 * @return {ErrorResponse} 500 - 服务器内部错误
 */

export default router;
