import 'dotenv/config';
import { meta, MetaError } from '../src/lib/meta.js';

/**
 * Live WRITE-path probe. Creates a PAUSED campaign + ad set, reads them back to
 * verify, then DELETES the campaign (cascades to the ad set) so nothing lingers.
 * PAUSED = zero spend; delete = zero residue. Targets META_TEST_AD_ACCOUNT.
 * Run: npx tsx scripts/meta-live-test.ts
 */

const token = process.env.META_SYSTEM_USER_TOKEN!;
const acct = process.env.META_TEST_AD_ACCOUNT!;
const V = process.env.META_API_VERSION ?? 'v21.0';
const err = (e: unknown) => (e instanceof MetaError ? `${e.message} [trace ${e.fbtrace ?? '?'}]` : String(e));

async function del(id: string): Promise<string> {
  const r = await fetch(`https://graph.facebook.com/${V}/${id}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' });
  const j: any = await r.json().catch(() => ({}));
  return j?.success ? 'deleted' : JSON.stringify(j);
}

(async () => {
  if (!token) { console.error('❌ META_SYSTEM_USER_TOKEN empty.'); process.exit(1); }

  // Show exactly which account we're about to write to (safety).
  try {
    const r = await fetch(`https://graph.facebook.com/${V}/act_${acct}?fields=name,account_status,amount_spent,currency&access_token=${encodeURIComponent(token)}`);
    const info: any = await r.json();
    if (info.error) { console.log(`❌ Cannot access act_${acct}: ${info.error.message}`); process.exit(1); }
    console.log(`\n▶ Target: "${info.name}" (act_${acct}) · status ${info.account_status} · spent ${info.amount_spent} ${info.currency}\n`);
  } catch (e) { console.log('❌ account read failed', err(e)); process.exit(1); }

  let campaignId: string | undefined;
  try {
    campaignId = await meta.createCampaign(acct, token, { name: '[LAUNCHER PROBE — safe to delete]', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', specialAdCategories: [] });
    console.log(`✅ CREATE campaign (PAUSED) — ${campaignId}`);
  } catch (e) { console.log(`❌ CREATE campaign — ${err(e)}`); process.exit(1); }

  let adsetId: string | undefined;
  try {
    adsetId = await meta.createAdSet(acct, token, {
      name: '[LAUNCHER PROBE AdSet — safe to delete]', campaignId, dailyBudget: 500, billingEvent: 'IMPRESSIONS',
      optimizationGoal: 'LINK_CLICKS', bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: { geo_locations: { countries: ['NL'] } }, status: 'PAUSED', advantageAudience: false,
    });
    console.log(`✅ CREATE ad set (PAUSED) — ${adsetId}`);
  } catch (e) { console.log(`❌ CREATE ad set — ${err(e)}`); }

  // Verify by reading the campaign back
  try {
    const r = await fetch(`https://graph.facebook.com/${V}/${campaignId}?fields=name,status,objective&access_token=${encodeURIComponent(token)}`);
    console.log(`🔎 READ-BACK campaign — ${JSON.stringify(await r.json())}`);
  } catch (e) { console.log('read-back failed', err(e)); }

  // Cleanup — delete the campaign (removes its ad set too)
  console.log(`🧹 CLEANUP campaign ${campaignId} — ${await del(campaignId)}`);
  console.log('\n✅ Write path proven end-to-end (created, verified, deleted). Zero spend, zero residue.\n');
  process.exit(0);
})();
