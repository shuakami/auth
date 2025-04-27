import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/index.js';
import { SESSION_SECRET, COOKIE_DOMAIN } from '../config/env.js';

const PgSession = connectPg(session);

export function sessionMiddleware() {
  const sessionOptions = {
    store: new PgSession({ pool, tableName: 'session' }),
    genid: (req) => {
      const newSid = uuidv4();
      console.log(`[SessionGenID] Generating new Session ID: ${newSid}`);
      return newSid;
    },
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 30,
      domain: COOKIE_DOMAIN || undefined
    }
  };

  console.log('[SessionInit] Initializing session middleware with options:', {
    name: sessionOptions.name,
    rolling: sessionOptions.rolling,
    genidProvided: typeof sessionOptions.genid === 'function',
    cookie: {
      secure: sessionOptions.cookie.secure,
      maxAge: sessionOptions.cookie.maxAge,
      domain: sessionOptions.cookie.domain,
      sameSite: sessionOptions.cookie.sameSite
    }
  });

  return session(sessionOptions);
}
