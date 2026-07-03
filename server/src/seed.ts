import { prisma } from './db.js';

// Seeds the demo tenant from the Adnova walkthrough: Ecubate → Walther Apparel.
async function main() {
  const ws = await prisma.workspace.upsert({
    where: { id: 'seed-ecubate' },
    update: {},
    create: { id: 'seed-ecubate', name: 'Ecubate' },
  });

  const account = await prisma.adAccount.upsert({
    where: { workspaceId_metaAccountId: { workspaceId: ws.id, metaAccountId: '000000000000000' } },
    update: {},
    create: {
      workspaceId: ws.id,
      metaAccountId: '000000000000000',
      name: 'Walther Apparel',
      currency: 'EUR',
      onboarded: true,
      settings: {
        create: {
          facebookPageId: '110429466968887',
          facebookPageName: 'Walther Apparel for Men',
          trackingEnabled: true,
          pixelName: 'FB Pixel van Walther Apparel for Men',
          namingTokens: ['{{filename}}'],
          namingSeparator: '_',
          multiAdvertiser: true,
          launchAsPaused: false,
          creativeEnhancements: {
            standardEnhancements: false,
            textImprovements: false,
            imageTemplates: false,
            brightnessContrast: false,
            uncrop: false,
          },
          placements: { mode: 'manual' },
        },
      },
    },
  });

  console.log('Seeded workspace', ws.name, '→ ad account', account.name);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
