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

  /** True when a Drive credential (service account or completed OAuth) is available. */
  isConnected(): boolean {
    return !!env.google.serviceAccountJson || !!oauthTokens;
  },

  /** Fetch file metadata for a single Drive file (used by bulk-link ingestion). */
  async getFileMeta(fileId: string) {
    const d = await this.client();
    const res = await d.files.get({
      fileId,
      fields: 'id,name,mimeType,size,imageMediaMetadata(width,height),videoMediaMetadata(width,height),thumbnailLink',
    });
    const f = res.data;
    return {
      driveFileId: f.id!,
      filename: f.name!,
      mimeType: f.mimeType!,
      type: f.mimeType!.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      width: f.imageMediaMetadata?.width ?? f.videoMediaMetadata?.width ?? null,
      height: f.imageMediaMetadata?.height ?? f.videoMediaMetadata?.height ?? null,
      sizeBytes: f.size ? Number(f.size) : null,
      thumbnailUrl: f.thumbnailLink ?? null,
    };
  },
};

/**
 * Extract a Drive file ID from a share link (or accept a bare ID). Handles:
 *   https://drive.google.com/file/d/<ID>/view?usp=sharing
 *   https://drive.google.com/open?id=<ID>
 *   https://drive.google.com/uc?id=<ID>&export=download
 *   <ID>  (already an id)
 */
export function parseDriveFileId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const byPath = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath) return byPath[1];
  const byQuery = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery) return byQuery[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s; // looks like a bare id
  return null;
}

/** Split a bulk paste (spaces, commas, or newlines) into unique Drive file IDs. */
export function parseBulkLinks(text: string): string[] {
  const ids = (text || '')
    .split(/[\s,]+/)
    .map((t) => parseDriveFileId(t))
    .filter((x): x is string => !!x);
  return [...new Set(ids)];
}
