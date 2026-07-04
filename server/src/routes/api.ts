import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { encrypt, decrypt } from '../crypto.js';
import { env } from '../env.js';
import { meta } from '../lib/meta.js';
import { drive } from '../lib/drive.js';
import { runBatch } from '../lib/launcher.js';
import { buildAdName } from '../lib/naming.js';

export const api = Router();

const wrap = (fn: (req: any, res: any) => Promise<any>) => (req: any, res: any) =>
  fn(req, res).catch((e: any) => {
    console.error(e);
    res.status(e.status ?? 500).json({ error: e.message ?? 'Server error', detail: e.raw ?? undefined });
  });

function tokenFor(account: { accessToken: string | null }): string {
  return account.accessToken ? decrypt(account.accessToken) : env.meta.systemUserToken;
}

// ─── Workspaces ──────────────────────────────────────────────────────────────
api.get('/workspaces', wrap(async (_req, res) => {
  res.json(await prisma.workspace.findMany({ include: { adAccounts: true }, orderBy: { createdAt: 'asc' } }));
}));

api.post('/workspaces', wrap(async (req, res) => {
  const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
  res.json(await prisma.workspace.create({ data: { name } }));
}));

// ─── Ad accounts ─────────────────────────────────────────────────────────────
api.get('/ad-accounts/:id', wrap(async (req, res) => {
  res.json(await prisma.adAccount.findUniqueOrThrow({ where: { id: req.params.id }, include: { settings: true } }));
}));

api.post('/ad-accounts', wrap(async (req, res) => {
  const body = z
    .object({ workspaceId: z.string(), metaAccountId: z.string(), name: z.string(), currency: z.string().optional(), accessToken: z.string().optional() })
    .parse(req.body);
  const account = await prisma.adAccount.create({
    data: {
      workspaceId: body.workspaceId,
      metaAccountId: body.metaAccountId,
      name: body.name,
      currency: body.currency ?? 'EUR',
      accessToken: body.accessToken ? encrypt(body.accessToken) : null,
      settings: { create: {} },
    },
    include: { settings: true },
  });
  res.json(account);
}));

api.put('/ad-accounts/:id/settings', wrap(async (req, res) => {
  const data = req.body ?? {};
  const updated = await prisma.adAccountSettings.update({ where: { adAccountId: req.params.id }, data });
  await prisma.adAccount.update({ where: { id: req.params.id }, data: { onboarded: true } });
  res.json(updated);
}));

// ─── Meta discovery (onboarding dropdowns) ─────────────────────────────────────
api.get('/ad-accounts/:id/meta/pages', wrap(async (req, res) => {
  const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json((await meta.listPages(tokenFor(account))).data);
}));

api.get('/ad-accounts/:id/meta/pixels', wrap(async (req, res) => {
  const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json((await meta.listPixels(account.metaAccountId, tokenFor(account))).data);
}));

// ─── Google Drive ──────────────────────────────────────────────────────────────
api.get('/drive/oauth/url', wrap(async (_req, res) => res.json({ url: drive.getAuthUrl() })));

api.get('/drive/oauth/callback', wrap(async (req, res) => {
  await drive.handleCallback(String(req.query.code));
  res.send('<script>window.close()</script>Google Drive connected. You can close this tab.');
}));

api.get('/drive/folders/:folderId/files', wrap(async (req, res) => {
  res.json(await drive.listFolder(req.params.folderId));
}));

/** Sync a Drive folder's files into a workspace's Creative library. */
api.post('/workspaces/:id/creatives/sync', wrap(async (req, res) => {
  const { folderId } = z.object({ folderId: z.string() }).parse(req.body);
  const files = await drive.listFolder(folderId);
  const created = [];
  for (const f of files) {
    const existing = await prisma.creative.findFirst({ where: { workspaceId: req.params.id, driveFileId: f.driveFileId } });
    if (existing) { created.push(existing); continue; }
    created.push(
      await prisma.creative.create({
        data: {
          workspaceId: req.params.id,
          driveFileId: f.driveFileId,
          filename: f.filename,
          mimeType: f.mimeType,
          type: f.type,
          width: f.width ?? undefined,
          height: f.height ?? undefined,
          sizeBytes: f.sizeBytes ?? undefined,
          thumbnailUrl: f.thumbnailUrl ?? undefined,
        },
      }),
    );
  }
  res.json(created);
}));

api.get('/workspaces/:id/creatives', wrap(async (req, res) => {
  res.json(await prisma.creative.findMany({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } }));
}));

// ─── Naming preview (for the onboarding wizard) ───────────────────────────────
api.post('/naming/preview', wrap(async (req, res) => {
  const { tokens, separator, removeDimensions, addSpaceAroundSeparator } = req.body;
  res.json({
    preview: buildAdName(tokens ?? ['{{filename}}'], separator ?? '_', {
      filename: 'Traffic_Broad_UK_Video2_1x1.mp4',
      adType: 'Video',
      removeDimensions,
      addSpaceAroundSeparator,
    }),
  });
}));

// ─── Launch ────────────────────────────────────────────────────────────────────
api.post('/ad-accounts/:id/launch', wrap(async (req, res) => {
  const body = z.object({ name: z.string(), targetType: z.string().optional(), payload: z.any() }).parse(req.body);
  const batch = await prisma.launchBatch.create({
    data: { adAccountId: req.params.id, name: body.name, targetType: body.targetType ?? 'NEW_CAMPAIGN', payload: body.payload, status: 'QUEUED' },
  });
  // Run async; the client polls the batch for status.
  runBatch(batch.id).catch((e) => console.error('batch failed', e));
  res.json(batch);
}));

api.get('/batches/:id', wrap(async (req, res) => {
  res.json(await prisma.launchBatch.findUniqueOrThrow({ where: { id: req.params.id }, include: { ads: true } }));
}));

api.get('/ad-accounts/:id/launched-ads', wrap(async (req, res) => {
  res.json(
    await prisma.launchedAd.findMany({
      where: { batch: { adAccountId: req.params.id } },
      include: { batch: true },
      orderBy: { createdAt: 'desc' },
    }),
  );
}));

// ─── Meta ad sets (launch table "Select Ad Set") ───────────────────────────────
api.get('/ad-accounts/:id/meta/adsets', wrap(async (req, res) => {
  const account = await prisma.adAccount.findUniqueOrThrow({ where: { id: req.params.id } });
  const token = tokenFor(account);
  if (!token) return res.json({ adsets: [], note: 'No Meta token — connect an account to load ad sets.' });
  try {
    const data = await meta.listAdSets(account.metaAccountId, token);
    res.json({ adsets: data.data });
  } catch (e: any) {
    res.json({ adsets: [], note: e.message });
  }
}));

// ─── Ad Copy Templates ─────────────────────────────────────────────────────────
api.get('/ad-accounts/:id/ad-copy-templates', wrap(async (req, res) => {
  res.json(await prisma.adCopyTemplate.findMany({ where: { adAccountId: req.params.id, isDefault: false }, orderBy: { createdAt: 'desc' } }));
}));

api.post('/ad-accounts/:id/ad-copy-templates', wrap(async (req, res) => {
  const b = req.body ?? {};
  res.json(await prisma.adCopyTemplate.create({ data: { ...b, adAccountId: req.params.id, isDefault: false } }));
}));

api.put('/ad-copy-templates/:tid', wrap(async (req, res) => {
  const { id, adAccountId, createdAt, updatedAt, ...data } = req.body ?? {};
  res.json(await prisma.adCopyTemplate.update({ where: { id: req.params.tid }, data }));
}));

api.delete('/ad-copy-templates/:tid', wrap(async (req, res) => {
  await prisma.adCopyTemplate.delete({ where: { id: req.params.tid } });
  res.json({ ok: true });
}));

// ─── Default Ad Copy (a single isDefault template per account) ──────────────────
api.get('/ad-accounts/:id/default-ad-copy', wrap(async (req, res) => {
  res.json(await prisma.adCopyTemplate.findFirst({ where: { adAccountId: req.params.id, isDefault: true } }));
}));

api.put('/ad-accounts/:id/default-ad-copy', wrap(async (req, res) => {
  const b = req.body ?? {};
  const existing = await prisma.adCopyTemplate.findFirst({ where: { adAccountId: req.params.id, isDefault: true } });
  const data = { ...b };
  delete data.id; delete data.adAccountId; delete data.createdAt; delete data.updatedAt;
  if (existing) res.json(await prisma.adCopyTemplate.update({ where: { id: existing.id }, data }));
  else res.json(await prisma.adCopyTemplate.create({ data: { ...data, name: 'Default Ad Copy', adAccountId: req.params.id, isDefault: true } }));
}));

// ─── Drafts (saved, not-yet-launched batches) ──────────────────────────────────
api.post('/ad-accounts/:id/drafts', wrap(async (req, res) => {
  const b = z.object({ name: z.string(), targetType: z.string().optional(), payload: z.any() }).parse(req.body);
  res.json(await prisma.launchBatch.create({
    data: { adAccountId: req.params.id, name: b.name, targetType: b.targetType ?? 'NEW_CAMPAIGN', payload: b.payload, status: 'DRAFT' },
  }));
}));

api.get('/ad-accounts/:id/drafts', wrap(async (req, res) => {
  res.json(await prisma.launchBatch.findMany({ where: { adAccountId: req.params.id, status: 'DRAFT' }, orderBy: { updatedAt: 'desc' } }));
}));

api.get('/ad-accounts/:id/batches', wrap(async (req, res) => {
  res.json(await prisma.launchBatch.findMany({ where: { adAccountId: req.params.id }, include: { ads: true }, orderBy: { createdAt: 'desc' } }));
}));
