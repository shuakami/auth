/**
 * Token服务 - 处理访问令牌和刷新令牌的生成与设置
 */
import { signAccessToken } from '../jwt.js';
import { NODE_ENV } from '../../config/env.js';

export class TokenService {
  /**
   * 生成并设置登录令牌
   * @param {Object} user 用户信息
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @returns {Promise<Object>} 令牌信息
   */
  async generateAndSetTokens(user, req, res) {
    // 生成访问令牌
    const accessToken = signAccessToken({ uid: user.id });
    
    // 生成刷新令牌
    const { createRefreshToken } = await import('../../services/refreshTokenService.js');
    const { token: refreshToken } = await createRefreshToken(
      user.id, 
      req.headers['user-agent'], 
      null
    );

    // 设置Cookie
    this._setTokenCookies(res, accessToken, refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 1800 // 30分钟 = 1800秒
    };
  }

  /**
   * 设置Token的httpOnly Cookie
   * @param {Object} res Express响应对象
   * @param {string} accessToken 访问令牌
   * @param {string} refreshToken 刷新令牌
   * @private
   */
  _setTokenCookies(res, accessToken, refreshToken) {
    // 验证token有效性，防止设置无效值
    if (!accessToken || typeof accessToken !== 'string' || accessToken === 'undefined') {
      console.error('[TokenService] Invalid accessToken:', accessToken);
      throw new Error('无效的访问令牌');
    }
    
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken === 'undefined') {
      console.error('[TokenService] Invalid refreshToken:', refreshToken);
      throw new Error('无效的刷新令牌');
    }

    const isProduction = NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/' // 确保cookie在整个域名下都可用，解决OAuth弹窗cookie无能访问问题
    };

    // 设置访问令牌Cookie（30分钟，与JWT过期时间匹配）
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 30 * 60 * 1000
    });

    // 设置刷新令牌Cookie（30天）
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    console.log('[TokenService] Tokens设置成功 - Access Token长度:', accessToken.length, 'Refresh Token长度:', refreshToken.length);
  }
}