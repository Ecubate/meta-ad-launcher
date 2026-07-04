import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';

const GROUPS: { key: string; title: string; sub: string; options: string[] }[] = [
  {
    key: '1x1',
    title: '1×1 or 4×5',
    sub: 'Feed placements',
    options: ['Facebook Feed', 'Facebook Marketplace', 'Facebook Video Feeds', 'Facebook Notification', 'Instagram Feed', 'Instagram Explore', 'Instagram Explore Home', 'Instagram Profile Feed', 'Messenger Inbox'],
  },
  {
    key: '9x16',
    title: '9×16',
    sub: 'Portrait placements',
    options: ['Facebook Story', 'Facebook Reels', 'Instagram Story', 'Instagram Reels', 'Instagram Search Results', 'Messenger Story', 'Audience Network Rewarded Video', 'Audience Network Native, Banner & Interstitial'],
  },
  {
    key: '16x9',
    title: '16×9',
    sub: 'Landscape / Right column placements',
    options: ['Facebook Right Column', 'Facebook Search Results'],
  },
];

export function ConfigurePlacementsPage() {
  const { account, reloadAccount } = useAccount();
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = account?.settings?.placements ?? {};
    const init: Record<string, string[]> = {};
    for (const g of GROUPS) init[g.key] = Array.isArray(stored?.[g.key]) ? stored[g.key] : g.options; // default all on
    setSel(init);
  }, [account?.id]);

  const toggle = (g: string, opt: string) =>
    setSel((s) => { const cur = s[g] ?? []; const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]; setSaved(false); return { ...s, [g]: next }; });

  async function save() {
    if (!account) return;
    await api.saveSettings(account.id, { placements: { mode: 'manual', ...sel } });
    await reloadAccount();
    setSaved(true);
  }

  return (
    <div className="px-8 pb-16">
      <div className="py-6 border-b border-line flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Configure Placements</h1>
          <p className="text-sm text-muted mt-1">Configure placements tailored for different aspect ratios.</p>
        </div>
        <button onClick={save} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium">{saved ? 'Saved ✓' : 'Save'}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        {GROUPS.map((g) => (
          <div key={g.key} className="border border-line rounded-xl p-4 bg-surface/40">
            <div className="mb-3">
              <h3 className="font-semibold text-fg">{g.title}</h3>
              <p className="text-xs text-muted">{g.sub}</p>
            </div>
            <div className="space-y-1.5">
              {g.options.map((opt) => {
                const on = (sel[g.key] ?? []).includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2.5 py-1 cursor-pointer text-sm">
                    <input type="checkbox" checked={on} onChange={() => toggle(g.key, opt)} className="accent-[--primary] w-4 h-4" />
                    <span className={on ? 'text-fg' : 'text-muted'}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
