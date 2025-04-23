/**
 * 用户注册请求体
 * @typedef {object} RegisterRequestBody
 * @property {string} email.required - 用户邮箱 - eg: user@example.com
 * @property {string} password.required - 用户密码 (长度至少10位, 且强度足够) - eg: StrongPwd123$%
 */

/**
 * 成功响应体 (包含消息)
 * @typedef {object} SuccessResponse
 * @property {string} message - 成功信息
 */

/**
 * 简单成功响应体 (只包含状态)
 * @typedef {object} SimpleSuccessResponse
 * @property {boolean} ok - 操作是否成功 - eg: true
 */

/**
 * 错误响应体
 * @typedef {object} ErrorResponse
 * @property {string} error - 错误信息
 */

/**
 * 用户登录请求体
 * @typedef {object} LoginRequestBody
 * @property {string} email.required - 用户邮箱 - eg: user@example.com
 * @property {string} password.required - 用户密码 - eg: StrongPwd123$%
 * @property {string} [token] - 6位TOTP令牌 (如果用户启用了2FA且未使用备份码) - eg: 123456
 * @property {string} [backupCode] - 备份码 (如果用户启用了2FA且未使用TOTP令牌) - eg: ABCD1234
 */

/**
 * 2FA 设置响应体
 * @typedef {object} Setup2FAResponse
 * @property {string} qr - 用于扫描的二维码 Data URL - eg: data:image/png;base64,...
 * @property {string} secret - 2FA密钥 (Base32编码) - eg: JBSWY3DPEHPK3PXP (仅用于调试)
 */

/**
 * 2FA 验证请求体
 * @typedef {object} Verify2FARequestBody
 * @property {string} token.required - 用户输入的6位2FA令牌 - eg: 123456
 */

/**
 * 2FA 验证成功响应体
 * @typedef {object} Verify2FASuccessResponse
 * @property {boolean} ok - 验证结果 - eg: true
 */

/**
 * 用户信息响应体
 * @typedef {object} UserInfoResponse
 * @property {object} user - 用户信息
 * @property {string} user.id - 用户ID
 * @property {string} user.email - 用户邮箱
 * @property {boolean} user.isVerified - 邮箱是否已验证
 * @property {boolean} user.is2FAEnabled - 是否启用了2FA
 */ 