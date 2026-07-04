import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Router, type Express, type Request, type Response, type NextFunction } from 'express';
import { env } from './env.js';

export type SessionUser = { id: string; name: string; email: string; picture?: string };

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user as SessionUser));
  passport.deserializeUser((user, done) => done(null, user as SessionUser));

  if (env.google.clientId && env.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        { clientID: env.google.clientId, clientSecret: env.google.clientSecret, callbackURL: env.google.authCallbackUrl },
        (_at, _rt, profile, done) => {
          const email = profile.emails?.[0]?.value ?? '';
          if (env.allowedEmailDomain && !email.endsWith(`@${env.allowedEmailDomain}`)) {
            return done(null, false, { message: 'Email domain not allowed' });
          }
          const user: SessionUser = { id: profile.id, name: profile.displayName, email, picture: profile.photos?.[0]?.value };
          done(null, user);
        },
      ),
    );
  }
}

export const authRouter = Router();

authRouter.get('/config', (_req, res) =>
  res.json({ google: !!(env.google.clientId && env.google.clientSecret), devLogin: env.devLogin }),
);

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=1' }),
  (_req, res) => res.redirect('/'),
);

// Local-only passwordless login so the tool is usable before Google creds exist.
authRouter.post('/dev-login', (req: Request, res: Response) => {
  if (!env.devLogin) return res.status(403).json({ error: 'Dev login disabled' });
  const user: SessionUser = { id: 'dev', name: 'Dev User', email: 'dev@ecubate.local' };
  req.login(user, (err) => (err ? res.status(500).json({ error: String(err) }) : res.json(user)));
});

authRouter.post('/logout', (req: Request, res: Response) => {
  req.logout(() => res.json({ ok: true }));
});

authRouter.get('/me', (req: Request, res: Response) => {
  if (req.isAuthenticated?.() && req.user) return res.json(req.user);
  res.status(401).json({ error: 'unauthenticated' });
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.() && req.user) return next();
  res.status(401).json({ error: 'unauthenticated' });
}
