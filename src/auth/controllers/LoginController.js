/**
 * 登录控制器 - 协调登录流程
 */
import { AuthenticationService } from '../services/AuthenticationService.js';
import * as User from '../../services/userService.js';

export class LoginController {
  constructor() {
    this.authService = new AuthenticationService();
  }
  
  async _handleAuthRequest(req, res, is2faVerification = false) {
    const { email, password, token, backupCode, totp } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    
    const context = {
      email,
      password: is2faVerification ? undefined : password,
      totpToken: token || totp,
      backupCode,
      deviceInfo,
      res,
      req,
      is2faOnly: is2faVerification,
    };
    
    try {
      const result = await this.authService.authenticate(context);
      
      if (result.status === 'success') {
        const user = await User.findById(result.userId);
        if (!user) {
          const status = is2faVerification ? 404 : 401;
          return res.status(status).json({ error: 'User not found' });
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
        return res.status(401).json({ error: result.error || '认证失败' });
      }
    } catch (error) {
      console.error(`[LoginController] ${is2faVerification ? '2FA' : ''} Auth error:`, error);
      return res.status(500).json({ error: '服务器内部错误' });
    }
  }
  
  handleLogin(req, res) {
    return this._handleAuthRequest(req, res, false);
  }
  
  handle2FAVerification(req, res) {
    return this._handleAuthRequest(req, res, true);
  }
}