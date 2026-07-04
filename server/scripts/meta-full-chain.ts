import 'dotenv/config';
import { meta, MetaError } from '../src/lib/meta.js';

/**
 * FULL end-to-end live proof: image upload → campaign → ad set → creative → ad,
 * everything PAUSED, then delete campaign (cascades) + creative. Zero spend, zero residue.
 * Run: npx tsx scripts/meta-full-chain.ts
 */

const token = process.env.META_SYSTEM_USER_TOKEN!;
const acct = process.env.META_TEST_AD_ACCOUNT!;
const V = process.env.META_API_VERSION ?? 'v21.0';
const err = (e: unknown) => (e instanceof MetaError ? `${e.message} [trace ${e.fbtrace ?? '?'}]` : String(e));
async function del(id: string) {
  const r = await fetch(`https://graph.facebook.com/${V}/${id}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' });
  const j: any = await r.json().catch(() => ({}));
  return j?.success ? 'deleted' : JSON.stringify(j);
}

(async () => {
  console.log(`\n▶ FULL chain against act_${acct}\n`);

  // 1. Page
  let page: { id: string; name: string } | undefined;
  try {
    const pages = await meta.listPages(token);
    page = pages.data[0];
    if (!page) { console.log('❌ No Facebook Page available to this token — creative needs a page.'); process.exit(1); }
    console.log(`✅ PAGE — "${page.name}" (${page.id})`);
  } catch (e) { console.log(`❌ list pages — ${err(e)}`); process.exit(1); }

  // 2. Image upload
  let imageHash: string | undefined;
  try {
    const img = await fetch('https://picsum.photos/600/600');
    const bytes = Buffer.from(await img.arrayBuffer());
    imageHash = await meta.uploadImage(acct, token, { bytes, filename: 'probe.jpg' });
    console.log(`✅ UPLOAD image — hash ${imageHash.slice(0, 12)}…`);
  } catch (e) { console.log(`❌ upload image — ${err(e)}`); process.exit(1); }

  // 3. Campaign + 4. Ad set
  let campaignId = '', adsetId = '';
  try {
    campaignId = await meta.createCampaign(acct, token, { name: '[PROBE campaign — delete]', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', specialAdCategories: [] });
    console.log(`✅ CAMPAIGN — ${campaignId}`);
    adsetId = await meta.createAdSet(acct, token, {
      name: '[PROBE adset — delete]', campaignId, dailyBudget: 500, billingEvent: 'IMPRESSIONS',
      optimizationGoal: 'LINK_CLICKS', bidStrategy: 'LOWEST_COST_WITHOUT_CAP', targeting: { geo_locations: { countries: ['NL'] } }, status: 'PAUSED', advantageAudience: false,
    });
    console.log(`✅ AD SET — ${adsetId}`);
  } catch (e) { console.log(`❌ campaign/adset — ${err(e)}`); if (campaignId) await del(campaignId); process.exit(1); }

  // 5. Creative
  let creativeId = '';
  try {
    creativeId = await meta.createAdCreative(acct, token, {
      name: '[PROBE creative — delete]', pageId: page!.id, imageHash,
      message: 'Launcher end-to-end probe — safe to ignore', headline: 'Probe', description: 'Probe',
      link: 'https://www.ecubate.com', ctaType: 'LEARN_MORE', multiAdvertiser: false,
    });
    console.log(`✅ CREATIVE — ${creativeId}`);
  } catch (e) { console.log(`❌ creative — ${err(e)}`); if (e instanceof MetaError) console.log('   detail:', JSON.stringify((e.raw as any)?.error ?? e.raw)); await del(campaignId); process.exit(1); }

  // 6. Ad
  let adId = '';
  try {
    adId = await meta.createAd(acct, token, { name: '[PROBE ad — delete]', adsetId, creativeId, status: 'PAUSED' });
    console.log(`✅ AD — ${adId}`);
  } catch (e) { console.log(`❌ ad — ${err(e)}`); }

  // 7. Verify
  if (adId) {
    const r = await fetch(`https://graph.facebook.com/${V}/${adId}?fields=name,status,creative&access_token=${encodeURIComponent(token)}`);
    console.log(`🔎 READ-BACK ad — ${JSON.stringify(await r.json())}`);
  }

  // 8. Cleanup
  console.log(`🧹 delete campaign — ${await del(campaignId)}`);
  console.log(`🧹 delete creative — ${await del(creativeId)}`);
  console.log(`\n${adId ? '✅ FULL CHAIN PROVEN: image → campaign → adset → creative → ad, live on Meta, then deleted.' : '⚠️ Chain reached creative; ad step needs review above.'}\n`);
  process.exit(0);
})();
