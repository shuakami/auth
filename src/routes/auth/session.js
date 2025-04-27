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
    const sessionID = req.sessionID;
    console.log(`[LogoutAttempt] Calling req.logout(). SessionID: ${sessionID}`);
    req.logout(function(err) {
      if (err) {
        console.error(`[LogoutError] Error during req.logout(). SessionID: ${sessionID}`, err);
        return next(err);
      }
      console.log(`[DestroyAttempt] Attempting to destroy session after logout. SessionID: ${sessionID}`);
      req.session?.destroy?.((destroyErr) => {
        if (destroyErr) {
          console.error(`[DestroyError] Error destroying session after logout. SessionID: ${sessionID}`, destroyErr);
        }
        console.log(`[DestroySuccess] Session destroyed or already gone after logout. SessionID: ${sessionID}`);
        res.clearCookie('sid');
        res.json({ ok: true });
      });
    });
  } else {
    const sessionID = req.sessionID;
    console.log(`[DestroyAttempt] Attempting to destroy session (no req.logout). SessionID: ${sessionID}`);
    req.session?.destroy?.((destroyErr) => {
      if (destroyErr) {
        console.error(`[DestroyError] Error destroying session (no req.logout). SessionID: ${sessionID}`, destroyErr);
      }
      console.log(`[DestroySuccess] Session destroyed or already gone (no req.logout). SessionID: ${sessionID}`);
      res.clearCookie('sid');
      res.json({ ok: true });
    });
  }
});

export default router;
