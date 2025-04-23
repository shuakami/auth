import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as User from '../services/userService.js';
import { sendVerifyEmail } from '../mail/resend.js';
import { signEmailToken, verifyEmailToken } from './jwt.js';
import { pool } from '../db/index.js';
import { decrypt } from './cryptoUtils.js';
import { verifyBackupCode } from './backupCodes.js';
import { validatePassword } from '../utils/passwordPolicy.js';

export async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const exists = await User.findByEmail(email);
    if (exists) return res.status(400).json({ error: 'email already used' });

    // 验证密码复杂度
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await User.createUser({ id, email, passwordHash });

    // 发送验证邮件
    const token = signEmailToken({ id });
    const link = `${req.protocol}://${req.get('host')}/verify?token=${token}`;
    await sendVerifyEmail(email, link);

    // 重新生成session
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);

      // 将用户信息保存到新的session
      req.login({ id, email }, (loginErr) => {
        if (loginErr) return next(loginErr);
        // 显式保存 session 以确保 cookie 更新
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          // 重新生成session并登录用户
          res.json({ ok: true });
        });
      });
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is missing.' });
    }
    const payload = verifyEmailToken(token);
    if (!payload || !payload.id) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    // 使用 pool.query 更新用户状态
    const result = await pool.query(
      "UPDATE users SET verified=TRUE WHERE id=$1",
      [payload.id]
    );

    if (result.rowCount === 0) {
        // 如果没有行被更新，可能意味着用户不存在或ID错误
        return res.status(404).json({ error: 'User not found for verification.' });
    }

    // 返回 JSON 响应，与文档保持一致
    res.json({ message: "Email verified successfully." });

  } catch (err) {
    console.error("Error verifying email:", err);
    // 将错误传递给下一个错误处理中间件
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, token, backupCode } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'invalid credentials' });

    if (user.totp_enabled) {
      // 如果用户提供了备份码，优先尝试验证备份码
      if (backupCode) {
        const backupOk = await verifyBackupCode(user.id, backupCode);
        if (backupOk) {
          // 备份码验证成功，继续登录流程
          return req.session.regenerate((regenErr) => {
            if (regenErr) return next(regenErr);
            req.login({ id: user.id, email: user.email }, (loginErr) => {
              if (loginErr) return next(loginErr);
              // 显式保存 session 以确保 cookie 更新
              req.session.save((saveErr) => {
                if (saveErr) return next(saveErr);
                res.json({ ok: true });
              });
            });
          });
        }
        // 备份码验证失败
        return res.status(401).json({ error: 'invalid backup code' });
      }

      // 如果没有提供备份码，检查 TOTP 令牌
      if (!token) return res.status(206).json({ error: 'TOTP_REQUIRED' });
      const encryptedSecret = user.totp_secret;
      if (!encryptedSecret) {
        console.error(`User ${user.id} has totp_enabled but no totp_secret found.`);
        return res.status(500).json({ error: 'Internal server error during 2FA setup.' });
      }
      const decryptedSecret = decrypt(encryptedSecret);
      if (!decryptedSecret) {
        console.error(`Failed to decrypt TOTP secret for user ${user.id} during login.`);
        return res.status(500).json({ error: 'Internal server error during 2FA verification.' });
      }
      const { verifyTotp } = await import('./totp.js');
      const ok = verifyTotp(decryptedSecret, token);
      if (!ok) return res.status(401).json({ error: 'invalid token' });
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);
      req.login({ id: user.id, email: user.email }, (loginErr) => {
        if (loginErr) return next(loginErr);
        // 显式保存 session 以确保 cookie 更新
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.json({ ok: true });
        });
      });
    });
  } catch (err) {
    console.error("Error during login:", err);
    next(err);
  }
}
