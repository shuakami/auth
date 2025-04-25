import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUCCESS_REDIRECT, PUBLIC_BASE_URL } from '../config/env.js';
import * as User from '../services/userService.js';

export function initOAuth(app) {
  // GitHub OAuth2
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: '/auth/github/callback',
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          const githubId = profile.id;
          let email = null;
          if (Array.isArray(profile.emails)) {
            email = profile.emails.find(e => e.primary && e.verified)?.value;
            if (!email) email = profile.emails.find(e => e.verified)?.value;
            if (!email) email = profile.emails.find(e => e.primary)?.value;
            if (!email && profile.emails.length > 0) email = profile.emails[0].value;
          }
          if (!email) email = `${githubId}@users.noreply.github.com`;

          let userByGithub = await User.findByGithubId(githubId); // 账号A
          let userByEmail = await User.findByEmail(email);        // 账号B
          console.log('[OAuth] userByGithub:', userByGithub);
          console.log('[OAuth] userByEmail:', userByEmail);

          // 只要 userByEmail 存在且 github_id 未绑定，就绑定 github_id
          if (userByEmail && !userByEmail.github_id) {
            console.log(`[OAuth] 绑定 github_id: ${githubId} 到 userByEmail: ${userByEmail.id}`);
            await User.bindGithubId(userByEmail.id, githubId);
            userByEmail.github_id = githubId;
          }

          if (userByGithub && userByEmail && userByGithub.id !== userByEmail.id) {
            console.log(`[OAuth] 合并账号：userByGithub(${userByGithub.id}) => userByEmail(${userByEmail.id})`);
            // 两个账号，合并：保留邮箱账号，迁移密码（如有必要）
            if (userByGithub.password_hash && !userByEmail.password_hash) {
              console.log(`[OAuth] 迁移 password_hash: ${userByGithub.id} => ${userByEmail.id}`);
              await User.migratePasswordHash(userByEmail.id, userByGithub.password_hash);
            }
            userByGithub = null;
            userByEmail = await User.findByEmail(email); // 重新获取
          }

          let user = userByGithub || userByEmail;

          if (!user) {
            console.log(`[OAuth] 新建用户: ${email}, githubId: ${githubId}`);
            // 新用户
            const id = uuidv4();
            await User.createUser({ id, email, githubId, verified: true });
            user = await User.findByEmail(email);
            if (!user) throw new Error('Failed to fetch newly created user');
          }

          // 查询完整用户信息，包含totp_enabled
          const fullUser = await User.findById(user.id);
          if (!fullUser) throw new Error(`User not found by ID ${user.id} after creation/lookup`);

          console.log('[OAuth] 最终待处理用户:', fullUser);

          // 检查 2FA 状态
          if (fullUser.totp_enabled) {
            // 如果启用了 2FA，不自动登录，传递状态信息给 authenticate 回调
            console.log(`[OAuth] 用户 ${fullUser.id} 需要 2FA，传递状态`);
            cb(null, false, { message: '2FA required', userId: fullUser.id });
          } else {
            // 如果未启用 2FA，正常传递用户信息以自动登录
            console.log(`[OAuth] 用户 ${fullUser.id} 无需 2FA，正常登录`);
            // 传递给 Passport 以触发 req.login() 的完整用户信息
            cb(null, {
              id: fullUser.id,
              email: fullUser.email,
              totp_enabled: fullUser.totp_enabled,
              username: fullUser.username,
              verified: fullUser.verified,
              github_id: fullUser.github_id,
              google_id: fullUser.google_id,
              has_password: !!fullUser.password_hash
            });
          }
        } catch (err) {
          console.error('[OAuth] GitHub Strategy Error:', err);
          cb(err);
        }
      }
    )
  );

  // Google OAuth2
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          const googleId = profile.id;
          let email = null;
          if (Array.isArray(profile.emails)) {
            email = profile.emails.find(e => e.verified)?.value;
            if (!email && profile.emails.length > 0) email = profile.emails[0].value;
          }
          // 返回邮箱不存在，尝试使用 display name 生成邮箱
          if (!email && profile.displayName) {
             // 尝试使用 display name 部分生成邮箱（可靠性较低）
             const nameParts = profile.displayName.split(' ');
             email = `${nameParts[0].toLowerCase()}.${googleId.substring(0, 5)}@noreply.google.placeholder.com`;
          } else if (!email) {
             email = `${googleId}@users.noreply.google.com`; // 原始邮箱生成
          }

          let userByGoogle = await User.findByGoogleId?.(googleId);
          let userByEmail = await User.findByEmail(email);

          // 绑定 google_id 如果邮箱存在且 google_id 未设置
           if (userByEmail && !userByEmail.google_id) {
             console.log(`[OAuth] 绑定 google_id: ${googleId} 到 userByEmail: ${userByEmail.id}`);
             await User.bindGoogleId?.(userByEmail.id, googleId);
             userByEmail.google_id = googleId; // Update local object
           }

          // 处理账号合并
          if (userByGoogle && userByEmail && userByGoogle.id !== userByEmail.id) {
             console.log(`[OAuth] 合并账号：userByGoogle(${userByGoogle.id}) => userByEmail(${userByEmail.id})`);
             if (userByGoogle.password_hash && !userByEmail.password_hash) {
               console.log(`[OAuth] 迁移 password_hash: ${userByGoogle.id} => ${userByEmail.id}`);
               await User.migratePasswordHash(userByEmail.id, userByGoogle.password_hash);
             }

             userByGoogle = null;
             userByEmail = await User.findByEmail(email);
           }

          let user = userByGoogle || userByEmail;

          if (!user) {
            console.log(`[OAuth] 新建用户: ${email}, googleId: ${googleId}`);
            const id = uuidv4();
            // 确保 verified 基于 Google 的信息设置，默认 true
            const isVerified = profile.emails?.some(e => e.verified) || false;
            await User.createUser({ id, email, googleId, verified: isVerified });
             user = await User.findByEmail(email);
             if (!user) throw new Error('Failed to fetch newly created user');
          }

          const fullUser = await User.findById(user.id);
           if (!fullUser) throw new Error(`User not found by ID ${user.id} after creation/lookup`);

          console.log('[OAuth] 最终待处理用户:', fullUser);

          // 检查 2FA 状态
          if (fullUser.totp_enabled) {
            console.log(`[OAuth] 用户 ${fullUser.id} 需要 2FA，传递状态`);
            cb(null, false, { message: '2FA required', userId: fullUser.id });
          } else {
            console.log(`[OAuth] 用户 ${fullUser.id} 无需 2FA，正常登录`);
            cb(null, {
              id: fullUser.id,
              email: fullUser.email,
              totp_enabled: fullUser.totp_enabled,
              username: fullUser.username,
              verified: fullUser.verified,
              github_id: fullUser.github_id, // Include github_id if applicable
              google_id: fullUser.google_id,
              has_password: !!fullUser.password_hash
            });
          }
        } catch (err) {
          console.error('[OAuth] Google Strategy Error:', err);
          cb(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    // 序列化时只存储 user.id 到 Session 中
    // console.log('[SerializeUser] Attempting to serialize user:', user); 
    if (!user || !user.id) { 
        console.error('[SerializeUser] Error: Invalid user object received for serialization.');
        return done(new Error('Invalid user object for serialization'));
    }
    // console.log('[SerializeUser] Serializing user ID:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    // 反序列化时根据 Session 中的 ID 从数据库查找完整用户对象
    // console.log(`[DeserializeUser] Attempting to deserialize user with ID: ${id}`); 
    if (!id) { 
        console.error('[DeserializeUser] Error: Invalid ID received for deserialization.');
        return done(new Error('Invalid ID for deserialization'));
    }
    try { 
      const user = await User.findById(id);
      if (user) {
        // console.log(`[DeserializeUser] User found for ID ${id}:`, { id: user.id, email: user.email, username: user.username }); 
        // 将数据库查到的用户对象附加到 req.user
        return done(null, { 
          id: user.id,
          email: user.email,
          username: user.username,
          verified: user.verified,
          totp_enabled: user.totp_enabled,
          github_id: user.github_id,
          google_id: user.google_id,
          has_password: !!user.password_hash
        });
      } else {
        // console.log(`[DeserializeUser] User not found for ID: ${id}`); 
        return done(null, false); // 用户未找到
      }
    } catch (err) {
      console.error(`[DeserializeUser] Error finding user by ID ${id}:`, err); 
      return done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/auth/github', passport.authenticate('github', { session: true }));

  app.get(
    '/auth/github/callback',
    (req, res, next) => { 
      passport.authenticate('github', { failureRedirect: '/', session: true }, (err, user, info) => {
        if (err) { return next(err); }
        // Case 1: 2FA Required
        if (user === false && info?.message === '2FA required') {
          console.log(`[OAuth Callback] GitHub 用户 ${info.userId} 需要 2FA`);
          req.session.pending2fa = true;
          req.session.pending2faUserId = info.userId;
          return req.session.save((saveErr) => {
              if (saveErr) { 
                  console.error('[OAuth Callback] [2FA Flow] Session save failed:', saveErr);
                  return next(saveErr);
              }
              // console.log('[OAuth Callback] [2FA Flow] Session saved successfully. Redirecting to /2fa-required...');
              res.redirect(`${PUBLIC_BASE_URL}/2fa-required`);
          });
        }
        // Case 2: Auth Failed
        if (!user) {
          console.log('[OAuth Callback] GitHub 登录失败或用户未找到');
          return res.redirect('/'); 
        }
        // Case 3: Success (No 2FA)
        console.log(`[OAuth Callback] GitHub 用户 ${user.id} 登录成功 (无需 2FA)`);
        
        // Explicitly call req.login() - Keep this call
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('[OAuth Callback] [Success Flow] req.login() failed:', loginErr);
                return next(loginErr);
            }
            // console.log('[OAuth Callback] [Success Flow] req.login() successful. Proceeding to save session...');
            
            // Save session and redirect
            req.session.save((saveErr) => {
                if (saveErr) { 
                    console.error('[OAuth Callback] [Success Flow] Session save failed after req.login():', saveErr);
                    return next(saveErr);
                }
                // console.log('[OAuth Callback] [Success Flow] Session saved successfully after req.login(). Redirecting...');
                res.redirect(SUCCESS_REDIRECT); // Restore redirect
            });
        });
      })(req, res, next);
    }
  );

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: true }));

  app.get(
    '/auth/google/callback',
    (req, res, next) => { 
      passport.authenticate('google', { failureRedirect: '/', session: true }, (err, user, info) => {
        if (err) { return next(err); }
        // Case 1: 2FA Required
        if (user === false && info?.message === '2FA required') {
          console.log(`[OAuth Callback] Google 用户 ${info.userId} 需要 2FA`);
          req.session.pending2fa = true;
          req.session.pending2faUserId = info.userId;
          return req.session.save((saveErr) => {
               if (saveErr) { 
                   console.error('[OAuth Callback] [2FA Flow] Session save failed:', saveErr);
                   return next(saveErr);
               }
               // console.log('[OAuth Callback] [2FA Flow] Session saved successfully. Redirecting to /2fa-required...');
               res.redirect(`${PUBLIC_BASE_URL}/2fa-required`);
            });
        }
        // Case 2: Auth Failed
        if (!user) {
          console.log('[OAuth Callback] Google 登录失败或用户未找到');
          return res.redirect('/');
        }
        // Case 3: Success (No 2FA)
        console.log(`[OAuth Callback] Google 用户 ${user.id} 登录成功 (无需 2FA)`);

        // Explicitly call req.login() - Keep this call
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('[OAuth Callback] [Success Flow] req.login() failed:', loginErr);
                return next(loginErr);
            }
            // console.log('[OAuth Callback] [Success Flow] req.login() successful. Proceeding to save session...');

            // Save session and redirect
            return req.session.save((saveErr) => { // Keep return for clarity
              if (saveErr) { 
                  console.error('[OAuth Callback] [Success Flow] Session save failed after req.login():', saveErr);
                  return next(saveErr); 
              }
              // console.log('[OAuth Callback] [Success Flow] Session saved successfully after req.login(). Redirecting...');
              res.redirect(SUCCESS_REDIRECT); // Restore redirect
            });
        });
      })(req, res, next);
    }
  );
}
