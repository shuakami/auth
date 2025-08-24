/**
 * 密码认证模块
 * 使用模块化架构，提高可维护性和可扩展性
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as User from '../services/userService.js';
import { sendVerifyEmail } from '../mail/resend.js';
import { signEmailToken, verifyEmailToken } from './jwt.js';
import { smartQuery } from '../db/index.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import { validateUsername } from '../utils/usernamePolicy.js';
import { PUBLIC_BASE_URL } from '../config/env.js';
import { LoginController } from './controllers/LoginController.js';

// 创建登录控制器实例
const loginController = new LoginController();

/**
 * 用户注册
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {Function} next 错误处理中间件
 */
export async function register(req, res, next) {
  try {
    const { email, password, username } = req.body;
    
    // 基本参数验证
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      const errorMessage = existingUser.github_id 
        ? '该邮箱已绑定 Github 账号，请直接用 Github 登录'
        : '邮箱已注册，请直接登录。';
      return res.status(400).json({ error: errorMessage });
    }

    // 验证用户名（如果提供）
    if (username) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        return res.status(400).json({ error: usernameError });
      }
      
      const usernameExists = await User.findByUsername(username);
      if (usernameExists) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
    }

    // 验证密码复杂度
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    await User.createUser({ 
      id: userId, 
      email, 
      username, 
      passwordHash 
    });

    // 发送验证邮件
    const verificationToken = signEmailToken({ id: userId });
    const verificationLink = `${PUBLIC_BASE_URL}/verify?token=${verificationToken}`;
    const emailSent = await sendVerifyEmail(email, verificationLink);

    // 返回成功响应
    res.json({ 
      ok: true, 
      message: "注册成功，请查收验证邮件完成账号激活。",
      emailSent 
    });

  } catch (err) {
    next(err);
  }
}

/**
 * 邮箱验证
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {Function} next 错误处理中间件
 */
export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    
    // 验证令牌是否存在
    if (!token) {
      console.warn('收到缺少验证令牌的请求');
      return res.status(400).json({ 
        error: '缺少验证令牌', 
        message: '验证链接无效，缺少必要的令牌。' 
      });
    }
    
    console.log('正在验证邮件令牌...');
    
    // 验证并解析令牌
    const payload = verifyEmailToken(token);
    if (!payload?.id) {
      console.warn('验证失败：无效或过期的令牌', { payload });
      return res.status(400).json({ 
        error: '无效或过期的验证令牌', 
        message: '邮箱验证链接已过期或无效，请重新登录获取新的验证链接。'
      });
    }

    console.log(`验证成功，正在更新用户(${payload.id})的验证状态...`);
    
    // 检查用户是否存在
    const user = await User.findById(payload.id);
    if (!user) {
      console.error(`用户验证失败：ID ${payload.id} 不存在`);
      return res.status(404).json({ 
        error: '用户不存在', 
        message: '找不到对应的用户账号，请重新注册。'
      });
    }
    
    // 检查是否已经验证过
    if (user.verified) {
      console.log(`用户(${payload.id})邮箱已经验证过`);
      return res.json({ 
        message: "邮箱已验证，无需重复验证。",
        alreadyVerified: true
      });
    }

    // 更新验证状态
    const result = await smartQuery(
      "UPDATE users SET verified=TRUE WHERE id=$1",
      [payload.id]
    );

    if (result.rowCount === 0) {
      console.error(`用户验证失败：更新操作对ID ${payload.id} 无效`);
      return res.status(404).json({ 
        error: '验证失败', 
        message: '更新验证状态失败，请联系管理员。'
      });
    }

    console.log(`用户(${payload.id})邮箱验证成功完成`);

    // 返回成功响应
    res.json({ 
      message: "邮箱验证成功，现在您可以登录账号了。",
      verified: true
    });

  } catch (err) {
    console.error("邮箱验证过程中出错:", err);
    res.status(500).json({
      error: '服务器内部错误',
      message: '验证邮箱时发生错误，请稍后再试或联系客服。'
    });
  }
}

/**
 * 用户登录 - 重构后的简化版本
 * 使用新的登录控制器和策略模式
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {Function} next 错误处理中间件
 */
export async function login(req, res, next) {
  try {
    // 委托给登录控制器处理
    await loginController.handleLogin(req, res);
  } catch (err) {
    console.error("Error during login:", err);
    next(err);
  }
}

router.post('/2fa/verify', async (req, res, next) => {
  try {
    await loginController.handle2FAVerification(req, res);
  } catch(err) {
    console.error("Error during 2FA verification:", err);
    next(err);
  }
});

export default router;

/**
 * 掩码IP地址 - 保留原有的工具函数
 * @param {string} ip IP地址
 * @returns {string} 掩码后的IP地址
 */
export function maskIp(ip) {
  if (!ip) return '';
  
  // IPv4处理
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split('.');
    let last = parts[3];
    if (last.length > 2) {
      last = last.slice(0, -2) + '**';
    } else if (last.length === 2) {
      last = '*' + last.slice(1);
    } else {
      last = '*';
    }
    return parts.slice(0, 3).join('.') + '.' + last;
  }
  
  // IPv6处理
  if (ip.includes(':')) {
    const segs = ip.split(':');
    return segs.slice(0, 3).join(':') + ':****:****';
  }
  
  // 其他情况直接返回
  return ip;
}
