import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { v4 as uuidv4 } from 'uuid';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SUCCESS_REDIRECT } from '../config/env.js';
import * as User from '../services/userService.js';

export function initOAuth(app) {
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
          let user = await User.findByGithubId(githubId);
          if (!user) {
            const primaryEmail = profile.emails?.find((e) => e.primary)?.value;
            const email = primaryEmail || `${githubId}@users.noreply.github.com`;
            user = await User.findByEmail(email);
            if (!user) {
              const id = uuidv4();
              await User.createUser({ id, email, githubId, verified: true });
              user = { id, email };
            }
          }
          cb(null, { id: user.id, email: user.email });
        } catch (err) {
          cb(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    if (user) return done(null, { id: user.id, email: user.email });
    done(null, false);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/auth/github', passport.authenticate('github', { session: true }));

  app.get(
    '/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/', session: true }),
    (req, res) => {
      res.redirect(SUCCESS_REDIRECT);
    }
  );
}
