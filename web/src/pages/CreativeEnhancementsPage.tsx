import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';
import { Toggle } from '../components/ui';

// Exact enhancement lists per ad type, mirroring Adnova / Meta Advantage+ creative options.
const AD_TYPES: { key: string; title: string; features: string[] }[] = [
  {
    key: 'image',
    title: 'Image',
    features: ['Relevant comments', 'Visual touch-ups', 'Text improvements', 'Add overlays', 'Adjust brightness and contrast', 'Music', 'Image animation', 'Add site links', 'Add catalog items', 'Add details to ad layout', 'Enhance CTA', 'Reveal details over time', 'Flex media', 'Translate text', 'Show summaries', 'Show spotlights', 'Image auto crop'],
  },
  {
    key: 'video',
    title: 'Video',
    features: ['Relevant comments', 'Visual touch-ups', 'Text improvements', 'Add video effects', 'Add catalog items', 'Add site links', 'Add details to ad layout', 'Enhance CTA', 'Reveal details over time', 'Flex media', 'Translate text', 'Show summaries', 'Show spotlights'],
  },
  {
    key: 'carousel',
    title: 'Carousel',
    features: ['Relevant comments', 'Visual touch-ups', 'Profile end card', 'Highlight carousel card', 'Dynamic description', 'Adapt multi-image format', 'Enhance CTA'],
  },
  {
    key: 'collection',
    title: 'Collection',
    features: ['Adapt to placement', 'Dynamic media', 'Dynamic description', 'Hide price', 'Generate backgrounds', 'Enhance CTA'],
  },
  {
    key: 'catalogCarousel',
    title: 'Catalog Carousel',
    features: ['Advantage+ creative for catalogue', 'Expand image', 'Music', 'Dynamic media', 'Dynamic description', 'Adapt to placement'],
  },
  {
    key: 'flexible',
    title: 'Flexible Ads',
    features: ['Advantage+ creative optimisations'],
  },
];

const featKey = (f: string) => f.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function CreativeEnhancementsPage() {
  const { account, loading, reloadAccount } = useAccount();
  const [state, setState] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = account?.settings?.creativeEnhancements ?? {};
    const init: Record<string, Record<string, boolean>> = {};
    for (const t of AD_TYPES) {
      init[t.key] = {};
      for (const f of t.features) init[t.key][featKey(f)] = !!stored?.[t.key]?.[featKey(f)];
    }
    setState(init);
  }, [account?.id]);

  const allOn = useMemo(() => {
    const vals = Object.values(state).flatMap((s) => Object.values(s));
    return vals.length > 0 && vals.every(Boolean);
  }, [state]);

  const setFeature = (type: string, key: string, v: boolean) =>
    setState((prev) => ({ ...prev, [type]: { ...prev[type], [key]: v } }));

  const setSection = (type: string, v: boolean) =>
    setState((prev) => ({ ...prev, [type]: Object.fromEntries(Object.keys(prev[type]).map((k) => [k, v])) }));

  const setAll = (v: boolean) =>
    setState((prev) => Object.fromEntries(Object.entries(prev).map(([t, s]) => [t, Object.fromEntries(Object.keys(s).map((k) => [k, v]))])));

  async function save() {
    setSaving(true);
    try {
      await api.saveSettings(account!.id, { creativeEnhancements: state });
      await reloadAccount();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-muted text-sm">Loading…</div>;

  return (
    <div className="px-8 pb-16">
      <div className="py-6 border-b border-line flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Creative Enhancements</h1>
          <p className="text-sm text-muted mt-1">Enhance your ads with Meta creative enhancements. All off by default.</p>
        </div>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="py-4">
        <Toggle checked={allOn} onChange={setAll} label="Toggle all enhancements on/off" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {AD_TYPES.map((t) => {
          const sectionAll = Object.values(state[t.key] ?? {}).every(Boolean) && (state[t.key] && Object.keys(state[t.key]).length > 0);
          return (
            <div key={t.key} className="border border-line rounded-xl p-4 bg-surface/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-fg">{t.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted">
                  Select all
                  <Toggle checked={!!sectionAll} onChange={(v) => setSection(t.key, v)} />
                </div>
              </div>
              <div className="space-y-1">
                {t.features.map((f) => {
                  const k = featKey(f);
                  return (
                    <div key={k} className="flex items-center justify-between py-1.5 border-b border-line/50 last:border-0">
                      <span className="text-sm text-fg/90">{f}</span>
                      <Toggle checked={!!state[t.key]?.[k]} onChange={(v) => setFeature(t.key, k, v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
