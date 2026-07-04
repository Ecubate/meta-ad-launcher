import { buildPlacementTargeting } from '../src/lib/placements.js';

// Quick assertions for the placement-label → Meta-targeting mapping.
const cfg = {
  mode: 'manual',
  '1x1': ['Facebook Feed', 'Instagram Feed', 'Messenger Inbox'],
  '9x16': ['Instagram Reels', 'Facebook Story'],
  '16x9': ['Facebook Right Column'],
};
const out = buildPlacementTargeting(cfg);
console.log('mapped:', JSON.stringify(out, null, 2));

const ok =
  out.publisher_platforms?.sort().join(',') === 'facebook,instagram,messenger' &&
  out.facebook_positions?.sort().join(',') === 'feed,right_hand_column,story' &&
  out.instagram_positions?.sort().join(',') === 'reels,stream' &&
  out.messenger_positions?.join(',') === 'messenger_home';

console.log('empty config →', JSON.stringify(buildPlacementTargeting({})));
console.log(ok ? '\n✅ placement mapping correct' : '\n❌ mapping mismatch');
process.exit(ok ? 0 : 1);
