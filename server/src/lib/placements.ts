/**
 * Translates our saved placement config (human labels grouped by aspect ratio)
 * into Meta's ad-set `targeting` position fields. Specifying these explicitly is
 * what turns OFF Advantage+ (automatic) placements — the AI behavior we don't want.
 *
 * Meta position keys are documented but finicky; if the live API rejects one, it's
 * a one-line fix in the map below (same debugging pattern as the campaign bugs).
 */

type Platform = 'facebook' | 'instagram' | 'messenger' | 'audience_network';

// label → [platform, position-key]
const MAP: Record<string, [Platform, string]> = {
  // Feed (1×1 / 4×5)
  'Facebook Feed': ['facebook', 'feed'],
  'Facebook Marketplace': ['facebook', 'marketplace'],
  'Facebook Video Feeds': ['facebook', 'video_feeds'],
  'Instagram Feed': ['instagram', 'stream'],
  'Instagram Explore': ['instagram', 'explore'],
  'Instagram Explore Home': ['instagram', 'explore_home'],
  'Instagram Profile Feed': ['instagram', 'profile_feed'],
  'Messenger Inbox': ['messenger', 'messenger_home'],
  // Portrait (9×16)
  'Facebook Story': ['facebook', 'story'],
  'Facebook Reels': ['facebook', 'facebook_reels'],
  'Instagram Story': ['instagram', 'story'],
  'Instagram Reels': ['instagram', 'reels'],
  'Instagram Search Results': ['instagram', 'ig_search'],
  'Messenger Story': ['messenger', 'story'],
  'Audience Network Rewarded Video': ['audience_network', 'rewarded_video'],
  'Audience Network Native, Banner & Interstitial': ['audience_network', 'classic'],
  // Landscape / right column (16×9)
  'Facebook Right Column': ['facebook', 'right_hand_column'],
  'Facebook Search Results': ['facebook', 'search'],
  // 'Facebook Notification' intentionally omitted — not a targetable position.
};

const POSITION_FIELD: Record<Platform, string> = {
  facebook: 'facebook_positions',
  instagram: 'instagram_positions',
  messenger: 'messenger_positions',
  audience_network: 'audience_network_positions',
};

/**
 * @returns a partial targeting object with publisher_platforms + *_positions, or
 * {} when no manual placements are configured (caller then lets Meta decide —
 * which would be Advantage+, so the UI defaults everything on).
 */
export function buildPlacementTargeting(placements: unknown): Record<string, any> {
  if (!placements || typeof placements !== 'object') return {};
  const cfg = placements as Record<string, unknown>;

  // Collect selected labels across all aspect-ratio groups.
  const labels = new Set<string>();
  for (const key of ['1x1', '9x16', '16x9']) {
    const arr = cfg[key];
    if (Array.isArray(arr)) arr.forEach((l) => typeof l === 'string' && labels.add(l));
  }
  if (labels.size === 0) return {};

  const positions: Partial<Record<Platform, Set<string>>> = {};
  for (const label of labels) {
    const entry = MAP[label];
    if (!entry) continue;
    const [platform, pos] = entry;
    (positions[platform] ??= new Set()).add(pos);
  }

  const platforms = Object.keys(positions) as Platform[];
  if (platforms.length === 0) return {};

  const out: Record<string, any> = { publisher_platforms: platforms };
  for (const p of platforms) out[POSITION_FIELD[p]] = [...positions[p]!];
  return out;
}
