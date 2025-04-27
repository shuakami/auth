import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { pool } from '../db/index.js';
import { SESSION_SECRET, COOKIE_DOMAIN } from '../config/env.js';

const PgSession = connectPg(session);

export function sessionMiddleware() {
  const sessionOptions = {
    store: new PgSession({ pool, tableName: 'session' }),
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      domain: COOKIE_DOMAIN || undefined
    }
  };

  return session(sessionOptions);
}
