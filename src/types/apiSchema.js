/**
 * 用户注册请求体
 * @typedef {object} RegisterRequestBody
 * @property {string} email.required - 用户邮箱 - eg: user@example.com
 * @property {string} password.required - 用户密码 (长度至少10位, 且强度足够) - eg: StrongPwd123$%
 * @property {string} username.optional - 用户名 (3-20字符，支持字母/数字/下划线/中文，不能数字开头) - eg: Shuakami
 */

/**
 * 成功响应体 (包含消息)
 * @typedef {object} SuccessResponse
 * @property {string} message.required - 成功信息
 */

/**
 * 简单成功响应体 (只包含状态)
 * @typedef {object} SimpleSuccessResponse
 * @property {boolean} ok.required - 操作是否成功 - eg: true
 */

/**
 * 错误响应体
 * @typedef {object} ErrorResponse
 * @property {string} error.required - 错误信息
 */

/**
 * 用户登录请求体
 * @typedef {object} LoginRequestBody
 * @property {string} email.required - 用户邮箱 - eg: user@example.com
 * @property {string} password.required - 用户密码 - eg: StrongPwd123$%
 * @property {string} token.optional - 6位TOTP令牌 (如果用户启用了2FA且未使用备份码) - eg: 123456
 * @property {string} backupCode.optional - 备份码 (如果用户启用了2FA且未使用TOTP令牌) - eg: ABCD1234
 */

/**
 * 2FA 设置响应体（含备份码）
 * @typedef {object} Setup2FAResponse
 * @property {string} qr.required - 用于扫描的二维码 Data URL - eg: data:image/png;base64,...
 * @property {string} secret.required - 2FA密钥 (Base32编码) - eg: JBSWY3DPEHPK3PXP (仅用于调试)
 * @property {string[]} backupCodes.required - 备份码数组 - eg: ["ABCD1234", "EFGH5678"]
 * @property {string} message.optional - 附加提示信息
 */

/**
 * 2FA 验证请求体
 * @typedef {object} Verify2FARequestBody
 * @property {string} token.required - 用户输入的6位2FA令牌 - eg: 123456
 */

/**
 * 2FA 验证成功响应体
 * @typedef {object} Verify2FASuccessResponse
 * @property {boolean} ok.required - 验证结果 - eg: true
 */

/**
 * 用户对象
 * @typedef {object} User
 * @property {string} id.required - 用户ID
 * @property {string} email.required - 用户邮箱
 * @property {string|null} username.optional - 用户名（可能为null）
 * @property {boolean} verified.required - 邮箱是否已验证
 * @property {boolean} totp_enabled.required - 是否启用了2FA
 * @property {string|null} github_id.optional - GitHub账号ID（如果通过GitHub登录，可能为null）
 * @property {string|null} google_id.optional - Google账号ID（如果通过Google登录，可能为null）
 * @property {boolean} has_password.required - 是否已设置密码
 */

/**
 * 用户信息响应体
 * @typedef {object} UserInfoResponse
 * @property {User} user.required - 用户信息
 */

/**
 * 生成备份码响应体
 * @typedef {object} GenerateBackupCodesResponse
 * @property {string[]} codes.required - 新生成的备份码数组 - eg: ["ABCD1234", "EFGH5678"]
 */

/**
 * 剩余备份码数量响应体
 * @typedef {object} RemainingBackupCodesResponse
 * @property {number} count.required - 剩余可用的备份码数量 - eg: 8
 */

/**
 * 邮箱验证成功响应体
 * @typedef {object} VerifyEmailSuccessResponse
 * @property {string} message.required - 邮箱验证成功信息
 * @property {boolean} verified.required - 表示验证成功（如果是首次验证）
 * @property {boolean} alreadyVerified.optional - 表示用户之前已经验证过（如果适用）
 */

/**
 * 邮箱验证失败响应体
 * @typedef {object} VerifyEmailErrorResponse
 * @typedef {object} VerifyEmailErrorResponse
 * @property {string} error.required - 错误代码
 * @property {string} message.required - 用户友好的错误消息
 */

/**
 * Github 登录成功响应体
 * @typedef {object} GithubLoginResponse
 * @property {string} message.required - 登录成功信息
 * @property {string} redirectUrl.required - 登录成功后跳转的前端页面
 */

/**
 * Github 登录失败响应体
 * @typedef {object} GithubLoginErrorResponse
 * @property {string} error.required - 错误信息
 * @property {string} message.required - 用户友好的错误消息
 */

/**
 * Google 登录成功响应体
 * @typedef {object} GoogleLoginResponse
 * @property {string} message.required - 登录成功信息
 * @property {string} redirectUrl.required - 登录成功后跳转的前端页面
 */

/**
 * Google 登录失败响应体
 * @typedef {object} GoogleLoginErrorResponse
 * @property {string} error.required - 错误信息
 * @property {string} message.required - 用户友好的错误消息
 */

/**
 * 设置/修改密码请求体
 * @typedef {object} PasswordUpdateRequestBody
 * @property {string} oldPassword.optional - 旧密码（如已设置密码时必填）
 * @property {string} newPassword.required - 新密码
 */

/**
 * 忘记密码请求体
 * @typedef {object} ForgotPasswordRequestBody
 * @property {string} email.required - 用户邮箱 - eg: user@example.com
 */

/**
 * 忘记密码响应体
 * @typedef {object} ForgotPasswordResponse
 * @property {boolean} ok.required - 操作是否成功
 * @property {boolean} exists.required - 邮箱是否存在
 * @property {string} message.optional - 附加提示信息
 * @property {string} error.optional - 错误信息（如邮箱未注册）
 */

/**
 * 设置/更新用户名请求体
 * @typedef {object} UsernameUpdateRequestBody
 * @property {string} username.required - 新用户名 (3-20字符，支持字母/数字/下划线/中文，不能数字开头)
 */

/**
 * 设置/更新用户名响应体
 * @typedef {object} UsernameUpdateResponse
 * @property {boolean} ok.required - 是否成功
 * @property {string} username.required - 新用户名
 * @property {string} message.optional - 附加提示
 * @property {string} error.optional - 错误信息
 */

/**
 * 生成备份码请求体
 * @typedef {object} GenerateBackupCodesRequestBody
 * @property {string} password.required - 当前用户密码 - eg: StrongPwd123$%
 */

/**
 * 更换邮箱请求体
 * @typedef {object} EmailUpdateRequestBody
 * @property {string} newEmail.required - 新邮箱地址 - eg: newuser@example.com
 * @property {string} password.required - 当前用户密码 - eg: StrongPwd123$%
 */

/**
 * 更换邮箱响应体
 * @typedef {object} EmailUpdateResponse
 * @property {boolean} ok.required - 是否成功
 * @property {string} message.required - 操作结果说明
 * @property {string} error.optional - 错误信息
 */
