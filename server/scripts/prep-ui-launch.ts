import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { meta } from '../src/lib/meta.js';

// Prepares the seeded workspace for a REAL (paused) launch from the UI against
// Ecubate agency: repoints the account, forces launch-as-paused, sets a real page,
// tracking off, and gives creatives a real uploaded image hash.
const p = new PrismaClient();
const token = process.env.META_SYSTEM_USER_TOKEN!;
const ACCT = '845530968083845'; // Ecubate agency

(async () => {
  const a = await p.adAccount.findFirstOrThrow({ where: { workspaceId: 'seed-ecubate' } });
  await p.adAccount.update({ where: { id: a.id }, data: { metaAccountId: ACCT, name: 'Ecubate agency' } });
  await p.adAccountSettings.update({
    where: { adAccountId: a.id },
    data: {
      launchAsPaused: true, // SAFETY: ads created PAUSED, no spend
      facebookPageId: '321540157705588', facebookPageName: 'Lumera Luxe',
      instagramAccountId: null, instagramAccountName: null,
      trackingEnabled: false, pixelId: null,
    },
  });

  const img = await fetch('https://picsum.photos/600/600');
  const bytes = Buffer.from(await img.arrayBuffer());
  const hash = await meta.uploadImage(ACCT, token, { bytes, filename: 'ui-demo.jpg' });
  const upd = await p.creative.updateMany({ where: { workspaceId: 'seed-ecubate' }, data: { metaImageHash: hash, type: 'IMAGE' } });

  console.log(`READY → account ${a.id} (act_${ACCT}), paused=ON, page=Lumera Luxe, ${upd.count} creatives given image hash ${hash.slice(0, 12)}…`);
  process.exit(0);
})();
