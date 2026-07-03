import { google } from 'googleapis';
import fs from 'node:fs';
import { env } from '../env.js';

/**
 * Google Drive integration — the creative source.
 * Supports either a service account (server-to-server, simplest for an internal tool)
 * or user OAuth. For Phase 2, your static ad creator writes finished images into the
 * watched folder and this pulls them.
 */

function serviceAccountAuth() {
  if (!env.google.serviceAccountJson) return null;
  const creds = JSON.parse(fs.readFileSync(env.google.serviceAccountJson, 'utf8'));
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

function oauthClient() {
  return new google.auth.OAuth2(env.google.clientId, env.google.clientSecret, env.google.redirectUri);
}

// In-memory OAuth token store (swap to DB for production).
let oauthTokens: any = null;

export const drive = {
  getAuthUrl() {
    return oauthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  },

  async handleCallback(code: string) {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    oauthTokens = tokens;
    return tokens;
  },

  async client() {
    const sa = serviceAccountAuth();
    if (sa) return google.drive({ version: 'v3', auth: sa });
    const client = oauthClient();
    if (oauthTokens) client.setCredentials(oauthTokens);
    return google.drive({ version: 'v3', auth: client });
  },

  /** List image/video files in a Drive folder — feeds the creative picker. */
  async listFolder(folderId: string) {
    const d = await this.client();
    const res = await d.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
      fields: 'files(id,name,mimeType,size,imageMediaMetadata(width,height),videoMediaMetadata(width,height),thumbnailLink)',
      pageSize: 1000,
    });
    return (res.data.files ?? []).map((f) => ({
      driveFileId: f.id!,
      filename: f.name!,
      mimeType: f.mimeType!,
      type: f.mimeType!.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      width: f.imageMediaMetadata?.width ?? f.videoMediaMetadata?.width ?? null,
      height: f.imageMediaMetadata?.height ?? f.videoMediaMetadata?.height ?? null,
      sizeBytes: f.size ? Number(f.size) : null,
      thumbnailUrl: f.thumbnailLink ?? null,
    }));
  },

  /** Download a Drive file's raw bytes for upload to Meta. */
  async downloadFile(fileId: string): Promise<Buffer> {
    const d = await this.client();
    const res = await d.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
    return Buffer.from(res.data as ArrayBuffer);
  },
};
