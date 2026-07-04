import { expandRow } from '../src/lib/launcher.js';

// 2 primary texts × 2 headlines × 1 description = 4 ads, named _v1.._v4
const multi = expandRow(
  { creativeId: 'c1', primaryTexts: ['A', 'B'], headlines: ['H1', 'H2'], url: 'https://x' } as any,
  'adset_default',
  'hero',
);
// single values = 1 ad, base name (no _v suffix)
const single = expandRow(
  { creativeId: 'c1', primaryText: 'only', headline: 'one', url: 'https://x' } as any,
  'adset_default',
  'hero',
);

console.log('multi count:', multi.length, '| names:', multi.map((s) => s.adName).join(', '));
console.log('multi combos:', multi.map((s) => `${s.primaryText}/${s.headline}`).join(' · '));
console.log('single count:', single.length, '| name:', single[0].adName);

const ok =
  multi.length === 4 &&
  multi.map((s) => s.adName).join(',') === 'hero_v1,hero_v2,hero_v3,hero_v4' &&
  single.length === 1 &&
  single[0].adName === 'hero' &&
  multi.every((s) => s.adsetId === 'adset_default');

console.log(ok ? '\n✅ variation expansion correct' : '\n❌ expansion mismatch');
process.exit(ok ? 0 : 1);
