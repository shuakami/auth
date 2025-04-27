import express from 'express';

const router = express.Router();

/**
 * POST /logout
 * @tags 认证
 * @summary 用户登出
 * @description 注销当前用户会话，销毁 Session 并清除登录状态。
 * @return {SimpleSuccessResponse} 200 - 登出成功
 */
router.post('/logout', (req, res, next) => {
  if (typeof req.logout === 'function') {
    req.logout(function(err) {
      if (err) {
        return next(err);
      }
      req.session?.destroy?.((destroyErr) => {
        if (destroyErr) {
        }
        res.clearCookie('sid');
        res.json({ ok: true });
      });
    });
  } else {
    req.session?.destroy?.((destroyErr) => {
      if (destroyErr) {
      }
      res.clearCookie('sid');
      res.json({ ok: true });
    });
  }
});

export default router;
