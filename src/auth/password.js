import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as User from '../services/userService.js';
import { sendVerifyEmail } from '../mail/resend.js';
import { signEmailToken, verifyEmailToken } from './jwt.js';

export async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const exists = await User.findByEmail(email);
    if (exists) return res.status(400).json({ error: 'email already used' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await User.createUser({ id, email, passwordHash });

    // 发送验证邮件
    const token = signEmailToken({ id });
    const link = `${req.protocol}://${req.get('host')}/verify?token=${token}`;
    await sendVerifyEmail(email, link);

    req.login({ id, email }, (err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res) {
  const { token } = req.query;
  const payload = verifyEmailToken(token);
  if (!payload) return res.status(400).send('invalid token');
  await User.createUser({ id: payload.id, verified: true }); // simplistic; ideally update field
  res.send('邮箱已验证');
}

export async function login(req, res, next) {
  try {
    const { email, password, token } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'invalid credentials' });

    if (user.totp_enabled) {
      if (!token) return res.status(206).json({ error: 'TOTP_REQUIRED' });
      const { verifyTotp } = await import('./totp.js');
      const ok = verifyTotp(user.totp_secret, token);
      if (!ok) return res.status(401).json({ error: 'invalid token' });
    }

    req.login({ id: user.id, email: user.email }, (err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
}
