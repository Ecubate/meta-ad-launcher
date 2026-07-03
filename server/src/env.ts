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
  },
  google: {
    clientId: opt('GOOGLE_CLIENT_ID'),
    clientSecret: opt('GOOGLE_CLIENT_SECRET'),
    redirectUri: opt('GOOGLE_REDIRECT_URI', 'http://localhost:8787/api/drive/oauth/callback'),
    serviceAccountJson: opt('GOOGLE_SERVICE_ACCOUNT_JSON'),
  },
  tokenEncryptionKey: opt('TOKEN_ENCRYPTION_KEY', 'dev-insecure-key-change-me'),
};
