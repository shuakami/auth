/**
 * 登录控制器 - 协调登录流程
 */
import { AuthenticationService } from '../services/AuthenticationService.js';
import * as User from '../../services/userService.js';

export class LoginController {
  constructor() {
    this.authService = new AuthenticationService();
  }

  async handleLogin(req, res) {
    const { email, password, token, backupCode } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    
    const context = {
      email,
      password,
      totpToken: token,
      backupCode,
      deviceInfo,
      res,
    };

    try {
      const result = await this.authService.authenticate(context);
      
      if (result.status === 'success') {
        // 登录成功，返回用户信息
        const user = await User.findById(result.userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found after login' });
        }
        const { password_hash, ...rest } = user;
        return res.status(200).json({ 
          ok: true, 
          message: '登录成功', 
          exp: result.exp,
          user: { ...rest, has_password: !!password_hash } 
        });
      } else if (result.status === '2fa_required') {
        return res.status(401).json({ error: 'TOTP_REQUIRED' });
      } else {
        // 其他失败情况
        return res.status(401).json({ error: result.error || '认证失败' });
      }
    } catch (error) {
      console.error('[LoginController] Authentication error:', error);
      return res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async handle2FAVerification(req, res) {
    const { email, totp, backupCode } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

    try {
      const result = await this.authService.verify2FA({ email, totpToken: totp, backupCode, deviceInfo, res });

      if (result.status === 'success') {
        const user = await User.findById(result.userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found after 2FA verification' });
        }
        const { password_hash, ...rest } = user;
        return res.status(200).json({ 
          ok: true, 
          message: '2FA验证成功',
          exp: result.exp,
          user: { ...rest, has_password: !!password_hash }
        });
      } else {
        return res.status(401).json({ error: result.error || '2FA验证失败' });
      }
    } catch (error) {
      console.error('[LoginController] 2FA verification error:', error);
      return res.status(500).json({ error: '服务器内部错误' });
    }
  }
}