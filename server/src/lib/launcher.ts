import pLimit from 'p-limit';
import { prisma } from '../db.js';
import { decrypt } from '../crypto.js';
import { env } from '../env.js';
import { meta, MetaError } from './meta.js';
import { drive } from './drive.js';
import { buildAdName } from './naming.js';

/**
 * Executes a LaunchBatch: ensures media is uploaded, builds the campaign/adset
 * structure per the batch target type, and creates one ad per row.
 *
 * Each row = { creativeId, primaryText, headline, description, url, ctaType, adName? }.
 * Errors are captured per-ad so one bad row never sinks the whole batch.
 */

type Row = {
  creativeId: string;
  primaryText: string;
  headline?: string;
  description?: string;
  url: string;
  ctaType?: string;
  adName?: string;
};

type BatchPayload = {
  rows: Row[];
  // Targeting / structure
  objective?: string;
  campaignName?: string;
  existingCampaignId?: string;
  adsetName?: string;
  existingAdsetId?: string;
  dailyBudget?: number; // minor units
  targeting?: Record<string, any>;
  optimizationGoal?: string;
  customEventType?: string;
};

export async function runBatch(batchId: string) {
  const batch = await prisma.launchBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { adAccount: { include: { settings: true } } },
  });
  const account = batch.adAccount;
  const settings = account.settings;
  if (!settings) throw new Error('Ad account is not onboarded (no settings).');

  const token = account.accessToken ? decrypt(account.accessToken) : env.meta.systemUserToken;
  if (!token) throw new Error('No Meta access token available for this ad account.');

  const payload = batch.payload as unknown as BatchPayload;
  const accountId = account.metaAccountId;
  const launchStatus = settings.launchAsPaused ? 'PAUSED' : 'ACTIVE';

  await prisma.launchBatch.update({ where: { id: batchId }, data: { status: 'RUNNING' } });

  // 1. Resolve / create the campaign.
  let campaignId = payload.existingCampaignId;
  if (!campaignId) {
    campaignId = await meta.createCampaign(accountId, token, {
      name: payload.campaignName ?? batch.name,
      objective: payload.objective ?? 'OUTCOME_SALES',
      status: launchStatus as 'PAUSED' | 'ACTIVE',
    });
  }

  // 2. Resolve / create the ad set.
  let adsetId = payload.existingAdsetId;
  if (!adsetId) {
    adsetId = await meta.createAdSet(accountId, token, {
      name: payload.adsetName ?? `${batch.name} — Ad Set`,
      campaignId,
      dailyBudget: payload.dailyBudget,
      optimizationGoal: payload.optimizationGoal,
      pixelId: settings.trackingEnabled ? settings.pixelId ?? undefined : undefined,
      customEventType: payload.customEventType,
      targeting: payload.targeting ?? { geo_locations: { countries: ['NL'] } },
      status: launchStatus as 'PAUSED' | 'ACTIVE',
      advantageAudience: false, // AI audience OFF
    });
  }

  // 3. One ad per row, with bounded concurrency + per-row error capture.
  const limit = pLimit(4);
  const enhancements = (settings.creativeEnhancements ?? {}) as Record<string, boolean>;
  const namingTokens = (settings.namingTokens ?? ['{{filename}}']) as string[];

  await Promise.all(
    payload.rows.map((row) =>
      limit(async () => {
        const creative = await prisma.creative.findUniqueOrThrow({ where: { id: row.creativeId } });
        const adRecord = await prisma.launchedAd.create({
          data: { batchId, name: row.adName ?? creative.filename, status: 'PENDING' },
        });
        try {
          // Ensure media uploaded to Meta (cache the hash/id on the creative).
          let imageHash = creative.metaImageHash ?? undefined;
          let videoId = creative.metaVideoId ?? undefined;
          if (!imageHash && !videoId && creative.driveFileId) {
            const bytes = await drive.downloadFile(creative.driveFileId);
            if (creative.type === 'VIDEO') {
              videoId = await meta.uploadVideo(accountId, token, { bytes, filename: creative.filename });
              await prisma.creative.update({ where: { id: creative.id }, data: { metaVideoId: videoId } });
            } else {
              imageHash = await meta.uploadImage(accountId, token, { bytes, filename: creative.filename });
              await prisma.creative.update({ where: { id: creative.id }, data: { metaImageHash: imageHash } });
            }
          }

          const adName = row.adName ?? buildAdName(namingTokens, settings.namingSeparator, {
            filename: creative.filename,
            adType: creative.type === 'VIDEO' ? 'Video' : 'Image',
            removeDimensions: settings.removeDimensionsFromName,
          });

          const creativeId = await meta.createAdCreative(accountId, token, {
            name: adName,
            pageId: settings.facebookPageId!,
            instagramActorId: settings.instagramAccountId ?? undefined,
            imageHash,
            videoId,
            message: row.primaryText,
            headline: row.headline,
            description: row.description,
            link: row.url,
            ctaType: row.ctaType,
            enhancements,
            multiAdvertiser: settings.multiAdvertiser,
          });

          const adId = await meta.createAd(accountId, token, {
            name: adName,
            adsetId: adsetId!,
            creativeId,
            status: launchStatus as 'PAUSED' | 'ACTIVE',
          });

          await prisma.launchedAd.update({
            where: { id: adRecord.id },
            data: { status: 'CREATED', metaCampaignId: campaignId, metaAdsetId: adsetId, metaAdId: adId, metaCreativeId: creativeId },
          });
        } catch (err) {
          const msg = err instanceof MetaError ? `${err.message} (trace ${err.fbtrace ?? '?'})` : String(err);
          await prisma.launchedAd.update({ where: { id: adRecord.id }, data: { status: 'ERROR', error: msg } });
        }
      }),
    ),
  );

  const failed = await prisma.launchedAd.count({ where: { batchId, status: 'ERROR' } });
  await prisma.launchBatch.update({
    where: { id: batchId },
    data: { status: failed ? 'COMPLETED' : 'COMPLETED' },
  });

  return { campaignId, adsetId };
}
