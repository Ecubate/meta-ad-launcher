import 'dotenv/config';

function opt(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(opt('PORT', '8787')),
  meta: {
    version: opt('META_API_VERSION', 'v21.0'),
    appId: opt('META_APP_ID'),
    appSecret: opt('META_APP_SECRET'),
    systemUserToken: opt('META_SYSTEM_USER_TOKEN'),
    // Callback goes through the app origin (Vite proxy in dev) so the session cookie is sent.
    oauthRedirect: opt('META_OAUTH_REDIRECT', 'http://localhost:5173/api/meta/oauth/callback'),
  },
  google: {
    clientId: opt('GOOGLE_CLIENT_ID'),
    clientSecret: opt('GOOGLE_CLIENT_SECRET'),
    redirectUri: opt('GOOGLE_REDIRECT_URI', 'http://localhost:8787/api/drive/oauth/callback'),
    serviceAccountJson: opt('GOOGLE_SERVICE_ACCOUNT_JSON'),
    authCallbackUrl: opt('GOOGLE_AUTH_CALLBACK_URL', 'http://localhost:8787/api/auth/google/callback'),
  },
  tokenEncryptionKey: opt('TOKEN_ENCRYPTION_KEY', 'dev-insecure-key-change-me'),
  sessionSecret: opt('SESSION_SECRET', 'dev-session-secret-change-me'),
  // Restrict Google login to this email domain (empty = allow any). e.g. "ecubate.com"
  allowedEmailDomain: opt('ALLOWED_EMAIL_DOMAIN'),
  // Allow the passwordless dev login button (local only). Set to "false" in prod.
  devLogin: opt('DEV_LOGIN', 'true') !== 'false',
};
