import pLimit from 'p-limit';
import { prisma } from '../db.js';
import { decrypt } from '../crypto.js';
import { env } from '../env.js';
import { meta, MetaError } from './meta.js';
import { drive } from './drive.js';
import { buildAdName } from './naming.js';
import { buildPlacementTargeting } from './placements.js';

/**
 * Executes a LaunchBatch: ensures media is uploaded, builds the campaign/adset
 * structure per the batch target type, and creates one ad per row.
 *
 * If no Meta token is configured, runs in DRY-RUN mode: it walks the exact same
 * flow and records ads as CREATED with `dryrun_*` ids, so the launcher is fully
 * demonstrable before credentials exist. Swaps to real Meta calls the moment a
 * System User token is set.
 */

type Row = {
  creativeId: string;
  // Variations: arrays are the modern shape; single fields kept for backward compat.
  primaryTexts?: string[];
  headlines?: string[];
  descriptions?: string[];
  primaryText?: string;
  headline?: string;
  description?: string;
  url: string;
  ctaType?: string;
  adName?: string;
  existingAdsetId?: string;
};

/** A single ad to create (one variation combination of a row). */
type AdSpec = {
  creativeId: string;
  adsetId: string;
  adName: string;
  primaryText: string;
  headline?: string;
  description?: string;
  url: string;
  ctaType?: string;
};

const MAX_ADS_PER_BATCH = 250; // safety cap against variation explosion

/** Expand a row's primary-text × headline × description variations into individual ad specs. */
export function expandRow(row: Row, defaultAdsetId: string, adName: string): AdSpec[] {
  const nonEmpty = (arr?: string[], fallback?: string) => {
    const list = (arr && arr.length ? arr : [fallback ?? '']).map((s) => (s ?? '').trim()).filter((s) => s !== '');
    return list.length ? list : [''];
  };
  const pts = nonEmpty(row.primaryTexts, row.primaryText);
  const hls = nonEmpty(row.headlines, row.headline);
  const dcs = nonEmpty(row.descriptions, row.description);
  const total = pts.length * hls.length * dcs.length;
  const adsetId = row.existingAdsetId ?? defaultAdsetId;

  const specs: AdSpec[] = [];
  let i = 0;
  for (const p of pts) for (const h of hls) for (const d of dcs) {
    i++;
    specs.push({
      creativeId: row.creativeId, adsetId, url: row.url, ctaType: row.ctaType,
      adName: total > 1 ? `${adName}_v${i}` : adName,
      primaryText: p, headline: h || undefined, description: d || undefined,
    });
  }
  return specs;
}

type BatchPayload = {
  rows: Row[];
  objective?: string;
  campaignName?: string;
  existingCampaignId?: string;
  adsetName?: string;
  existingAdsetId?: string;
  dailyBudget?: number;
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
  const dryRun = !token;

  const payload = (batch.payload ?? {}) as unknown as BatchPayload;
  const accountId = account.metaAccountId;
  const launchStatus = (settings.launchAsPaused ? 'PAUSED' : 'ACTIVE') as 'PAUSED' | 'ACTIVE';

  await prisma.launchBatch.update({ where: { id: batchId }, data: { status: 'RUNNING' } });

  // 1. Resolve / create the campaign.
  let campaignId = payload.existingCampaignId;
  if (!campaignId) {
    campaignId = dryRun
      ? `dryrun_camp_${batchId.slice(-6)}`
      : await meta.createCampaign(accountId, token, {
          name: payload.campaignName ?? batch.name,
          objective: payload.objective ?? 'OUTCOME_SALES',
          status: launchStatus,
        });
  }

  // 2. Resolve / create the ad set (unless each row targets an existing ad set).
  let defaultAdsetId = payload.existingAdsetId;
  if (!defaultAdsetId && !payload.rows.every((r) => r.existingAdsetId)) {
    // Manual placements from settings → turns OFF Advantage+ automatic placements.
    const baseTargeting = payload.targeting ?? { geo_locations: { countries: ['NL'] } };
    const targeting = { ...baseTargeting, ...buildPlacementTargeting(settings.placements) };
    defaultAdsetId = dryRun
      ? `dryrun_adset_${batchId.slice(-6)}`
      : await meta.createAdSet(accountId, token, {
          name: payload.adsetName ?? `${batch.name} — Ad Set`,
          campaignId,
          dailyBudget: payload.dailyBudget,
          optimizationGoal: payload.optimizationGoal,
          pixelId: settings.trackingEnabled ? settings.pixelId ?? undefined : undefined,
          customEventType: payload.customEventType,
          targeting,
          status: launchStatus,
          advantageAudience: false,
        });
  }

  const limit = pLimit(4);
  const enhancements = (settings.creativeEnhancements ?? {}) as Record<string, any>;
  const namingTokens = (settings.namingTokens ?? ['{{filename}}']) as string[];

  // Preload each unique creative, then expand every row's variations into a flat ad list.
  const creativeCache = new Map<string, any>();
  const specs: AdSpec[] = [];
  for (const row of payload.rows) {
    let creative = creativeCache.get(row.creativeId);
    if (!creative) {
      creative = await prisma.creative.findUniqueOrThrow({ where: { id: row.creativeId } });
      creativeCache.set(row.creativeId, creative);
    }
    const baseName =
      row.adName ??
      buildAdName(namingTokens, settings.namingSeparator, {
        filename: creative.filename,
        adType: creative.type === 'VIDEO' ? 'Video' : 'Image',
        removeDimensions: settings.removeDimensionsFromName,
      });
    specs.push(...expandRow(row, defaultAdsetId!, baseName));
  }
  const capped = specs.slice(0, MAX_ADS_PER_BATCH);

  // Live only: upload each unique creative's media ONCE (variations reuse the hash/id).
  if (!dryRun) {
    await Promise.all(
      [...creativeCache.values()].map((creative) =>
        limit(async () => {
          if (creative.metaImageHash || creative.metaVideoId || !creative.driveFileId) return;
          const bytes = await drive.downloadFile(creative.driveFileId);
          if (creative.type === 'VIDEO') {
            creative.metaVideoId = await meta.uploadVideo(accountId, token, { bytes, filename: creative.filename });
            await prisma.creative.update({ where: { id: creative.id }, data: { metaVideoId: creative.metaVideoId } });
          } else {
            creative.metaImageHash = await meta.uploadImage(accountId, token, { bytes, filename: creative.filename });
            await prisma.creative.update({ where: { id: creative.id }, data: { metaImageHash: creative.metaImageHash } });
          }
        }),
      ),
    );
  }

  // One ad per variation.
  await Promise.all(
    capped.map((spec) =>
      limit(async () => {
        const creative = creativeCache.get(spec.creativeId);
        const adRecord = await prisma.launchedAd.create({ data: { batchId, name: spec.adName, status: 'PENDING' } });
        try {
          if (dryRun) {
            await prisma.launchedAd.update({
              where: { id: adRecord.id },
              data: {
                status: 'CREATED', metaCampaignId: campaignId, metaAdsetId: spec.adsetId,
                metaAdId: `dryrun_ad_${adRecord.id.slice(-6)}`, metaCreativeId: `dryrun_cr_${adRecord.id.slice(-6)}`,
                error: 'DRY-RUN (no Meta token) — not sent to Meta',
              },
            });
            return;
          }

          const creativeId = await meta.createAdCreative(accountId, token, {
            name: spec.adName,
            pageId: settings.facebookPageId!,
            instagramActorId: settings.instagramAccountId ?? undefined,
            imageHash: creative.metaImageHash ?? undefined,
            videoId: creative.metaVideoId ?? undefined,
            message: spec.primaryText,
            headline: spec.headline,
            description: spec.description,
            link: spec.url,
            ctaType: spec.ctaType,
            enhancements,
            multiAdvertiser: settings.multiAdvertiser,
          });

          const adId = await meta.createAd(accountId, token, { name: spec.adName, adsetId: spec.adsetId, creativeId, status: launchStatus });

          await prisma.launchedAd.update({
            where: { id: adRecord.id },
            data: { status: 'CREATED', metaCampaignId: campaignId, metaAdsetId: spec.adsetId, metaAdId: adId, metaCreativeId: creativeId },
          });
        } catch (err) {
          const msg = err instanceof MetaError ? `${err.message} (trace ${err.fbtrace ?? '?'})` : String(err);
          await prisma.launchedAd.update({ where: { id: adRecord.id }, data: { status: 'ERROR', error: msg } });
        }
      }),
    ),
  );

  await prisma.launchBatch.update({ where: { id: batchId }, data: { status: 'COMPLETED' } });
  return { campaignId, defaultAdsetId, dryRun };
}
