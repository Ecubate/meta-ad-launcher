import 'dotenv/config';
import { meta } from '../src/lib/meta.js';

// Deletes leftover probe/UI-test campaigns on Ecubate agency (named "New Launch"
// or "[PROBE …]") so nothing junk is left on the production account.
const token = process.env.META_SYSTEM_USER_TOKEN!;
const ACCT = '845530968083845';
const V = process.env.META_API_VERSION ?? 'v21.0';

async function del(id: string) {
  const r = await fetch(`https://graph.facebook.com/${V}/${id}?access_token=${encodeURIComponent(token)}`, { method: 'DELETE' });
  return r.json();
}

(async () => {
  const c = await meta.listCampaigns(ACCT, token);
  const junk = c.data.filter((x) => x.name === 'New Launch' || x.name.startsWith('[PROBE'));
  console.log(`found ${junk.length} leftover campaign(s):`, junk.map((x) => `${x.name} (${x.id}, ${x.status})`));
  for (const o of junk) console.log('deleted', o.id, JSON.stringify(await del(o.id)));
  process.exit(0);
})();
