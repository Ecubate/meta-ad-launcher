import { env } from '../env.js';

/**
 * Facebook Login (OAuth) for the "Connect Facebook" flow. Produces a user access
 * token scoped for ads, which we exchange for a long-lived (~60 day) token and
 * store (encrypted) per workspace — replacing the pasted .env token.
 *
 * Requires META_APP_ID + META_APP_SECRET and the redirect URI registered in the
 * Meta app's "Facebook Login" settings.
 */

const SCOPES = ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'pages_read_engagement'];

export const metaOauth = {
  configured: () => !!(env.meta.appId && env.meta.appSecret),

  /** The Facebook consent-dialog URL to send the user to. */
  loginUrl(state: string): string {
    const u = new URL(`https://www.facebook.com/${env.meta.version}/dialog/oauth`);
    u.searchParams.set('client_id', env.meta.appId);
    u.searchParams.set('redirect_uri', env.meta.oauthRedirect);
    u.searchParams.set('scope', SCOPES.join(','));
    u.searchParams.set('state', state);
    u.searchParams.set('response_type', 'code');
    return u.toString();
  },

  /** Exchange the ?code from the callback for a short-lived user token. */
  async exchangeCode(code: string): Promise<string> {
    const u = new URL(`https://graph.facebook.com/${env.meta.version}/oauth/access_token`);
    u.searchParams.set('client_id', env.meta.appId);
    u.searchParams.set('client_secret', env.meta.appSecret);
    u.searchParams.set('redirect_uri', env.meta.oauthRedirect);
    u.searchParams.set('code', code);
    const res = await fetch(u);
    const j: any = await res.json();
    if (j.error) throw new Error(j.error.message ?? 'Code exchange failed');
    return j.access_token;
  },

  /** Upgrade a short-lived token to a long-lived (~60 day) one. */
  async longLived(shortToken: string): Promise<{ token: string; expiresInSec?: number }> {
    const u = new URL(`https://graph.facebook.com/${env.meta.version}/oauth/access_token`);
    u.searchParams.set('grant_type', 'fb_exchange_token');
    u.searchParams.set('client_id', env.meta.appId);
    u.searchParams.set('client_secret', env.meta.appSecret);
    u.searchParams.set('fb_exchange_token', shortToken);
    const res = await fetch(u);
    const j: any = await res.json();
    if (j.error) throw new Error(j.error.message ?? 'Long-lived exchange failed');
    return { token: j.access_token, expiresInSec: j.expires_in };
  },
};
