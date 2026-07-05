import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';
import { Section, Field, Input, Toggle, SaveButton } from '../components/ui';

const DIRECT_TAGS = ['{{filename}}', '{{ad type}}', '{{date}}'];
const PLACEHOLDER_TAGS = ['{{influencer}}', '{{product}}', '{{offer}}', '{{concept}}', '{{template name}}'];
const SEPARATORS = ['Underscore _', 'Dash -', 'Space'];

export function LaunchSettingsPage() {
  const { account, loading, reloadAccount } = useAccount();
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState<string>('');
  const [preview, setPreview] = useState('');
  const [pages, setPages] = useState<any[]>([]);
  const [pixels, setPixels] = useState<any[]>([]);

  useEffect(() => {
    if (account?.settings) setS({ ...account.settings });
  }, [account?.id]);

  // Best-effort load of Pages + Pixels from Meta (falls back to manual entry).
  useEffect(() => {
    if (!account) return;
    api.pages(account.id).then(setPages).catch(() => setPages([]));
    api.pixels(account.id).then(setPixels).catch(() => setPixels([]));
  }, [account?.id]);

  const tokens: string[] = useMemo(() => (Array.isArray(s?.namingTokens) ? s.namingTokens : ['{{filename}}']), [s]);

  // Live naming preview from the backend (same builder the launch engine uses).
  useEffect(() => {
    if (!s) return;
    const t = setTimeout(async () => {
      try {
        const { preview } = await api.namingPreview({
          tokens,
          separator: s.namingSeparator,
          removeDimensions: s.removeDimensionsFromName,
          addSpaceAroundSeparator: s.addSpaceAroundSeparator,
        });
        setPreview(preview);
      } catch { /* preview is best-effort */ }
    }, 200);
    return () => clearTimeout(t);
  }, [tokens, s?.namingSeparator, s?.removeDimensionsFromName, s?.addSpaceAroundSeparator]);

  if (loading || !s) return <div className="p-8 text-muted text-sm">Loading settings…</div>;

  const set = (patch: any) => setS((prev: any) => ({ ...prev, ...patch }));

  async function save(fields: string[], key: string) {
    setSaving(key);
    try {
      const data: any = {};
      for (const f of fields) data[f] = s[f];
      await api.saveSettings(account!.id, data);
      await reloadAccount();
    } finally {
      setSaving('');
    }
  }

  const addToken = (t: string) => set({ namingTokens: [...tokens, t] });
  const removeToken = (i: number) => set({ namingTokens: tokens.filter((_, idx) => idx !== i) });

  return (
    <div className="px-8 pb-16">
      <div className="py-6 border-b border-line">
        <h1 className="text-xl font-semibold text-fg">Launch Settings</h1>
        <p className="text-sm text-muted mt-1">Configure your launch settings for {account?.name}.</p>
      </div>

      {/* Ad Profiles */}
      <Section title="Ad Profiles" desc="The Facebook Page and Instagram account your ads publish from.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Facebook Page">
            {pages.length > 0 ? (
              <select
                value={s.facebookPageId ?? ''}
                onChange={(e) => {
                  const pg = pages.find((p) => p.id === e.target.value);
                  set({ facebookPageId: pg?.id ?? '', facebookPageName: pg?.name ?? '', instagramAccountId: pg?.instagram_business_account?.id ?? s.instagramAccountId });
                }}
                className="w-full px-3 py-2 rounded-md bg-input border border-line text-sm text-fg"
              >
                <option value="">Select a Page…</option>
                {s.facebookPageId && !pages.some((p) => p.id === s.facebookPageId) && (
                  <option value={s.facebookPageId}>{s.facebookPageName ?? s.facebookPageId} (saved)</option>
                )}
                {pages.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}
              </select>
            ) : (
              <>
                <Input value={s.facebookPageName ?? ''} placeholder="Page name" onChange={(e) => set({ facebookPageName: e.target.value })} />
                <Input className="mt-2" value={s.facebookPageId ?? ''} placeholder="Page ID" onChange={(e) => set({ facebookPageId: e.target.value })} />
              </>
            )}
          </Field>
          <Field label="Associated Instagram Account">
            <Input value={s.instagramAccountName ?? ''} placeholder="Instagram name" onChange={(e) => set({ instagramAccountName: e.target.value })} />
            <Input className="mt-2" value={s.instagramAccountId ?? ''} placeholder="Instagram ID" onChange={(e) => set({ instagramAccountId: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4">
          <SaveButton saving={saving === 'profiles'} onClick={() => save(['facebookPageId', 'facebookPageName', 'instagramAccountId', 'instagramAccountName'], 'profiles')} />
        </div>
      </Section>

      {/* Tracking Specs */}
      <Section title="Tracking Specs" desc="Enable tracking to measure website activity across your campaigns.">
        <Toggle checked={!!s.trackingEnabled} onChange={(v) => set({ trackingEnabled: v })} label="Enable Tracking Specs" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Website pixel">
            {pixels.length > 0 ? (
              <select
                value={s.pixelId ?? ''}
                onChange={(e) => { const px = pixels.find((p) => p.id === e.target.value); set({ pixelId: px?.id ?? '', pixelName: px?.name ?? '' }); }}
                className="w-full px-3 py-2 rounded-md bg-input border border-line text-sm text-fg"
              >
                <option value="">Select a Pixel…</option>
                {s.pixelId && !pixels.some((p) => p.id === s.pixelId) && <option value={s.pixelId}>{s.pixelName ?? s.pixelId} (saved)</option>}
                {pixels.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}
              </select>
            ) : (
              <>
                <Input value={s.pixelName ?? ''} placeholder="Pixel name" onChange={(e) => set({ pixelName: e.target.value })} />
                <Input className="mt-2" value={s.pixelId ?? ''} placeholder="Pixel ID" onChange={(e) => set({ pixelId: e.target.value })} />
              </>
            )}
          </Field>
          <Field label="App (optional)">
            <Input value={s.appId ?? ''} placeholder="App ID" onChange={(e) => set({ appId: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4">
          <SaveButton saving={saving === 'tracking'} onClick={() => save(['trackingEnabled', 'pixelId', 'pixelName', 'appId'], 'tracking')} />
        </div>
      </Section>

      {/* Other Launch Settings */}
      <Section title="Other Launch Settings" desc="Choose how new ads launch by default.">
        <div className="space-y-4">
          <Toggle checked={!!s.multiAdvertiser} onChange={(v) => set({ multiAdvertiser: v })} label="Multi Advertiser" hint="Enable multi advertiser optimization" />
          <Toggle checked={!!s.launchAsPaused} onChange={(v) => set({ launchAsPaused: v })} label="Launch Ads as Paused" hint="Create ads in paused state (default active)" />
        </div>
        <div className="mt-4">
          <SaveButton saving={saving === 'other'} onClick={() => save(['multiAdvertiser', 'launchAsPaused'], 'other')} />
        </div>
      </Section>

      {/* Ad Naming Convention */}
      <Section title="Ad Naming Convention" desc="How launched ads are named. Placeholder tags can be filled per-ad during launch.">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-medium text-muted mb-1.5">Direct Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {DIRECT_TAGS.map((t) => (
                <button key={t} onClick={() => addToken(t)} className="px-2 py-1 rounded bg-[#211538] text-violet-300 text-xs hover:bg-[#2b1a48]">{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted mb-1.5">Placeholder Text</div>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDER_TAGS.map((t) => (
                <button key={t} onClick={() => addToken(t)} className="px-2 py-1 rounded bg-[#211538] text-violet-300 text-xs hover:bg-[#2b1a48]">{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-5">
          <Field label="Separator">
            <select value={s.namingSeparator ?? 'Underscore _'} onChange={(e) => set({ namingSeparator: e.target.value })} className="w-full px-3 py-2 rounded-md bg-input border border-line text-sm text-fg">
              {SEPARATORS.map((sep) => <option key={sep}>{sep}</option>)}
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-2">
            <Toggle checked={!!s.addSpaceAroundSeparator} onChange={(v) => set({ addSpaceAroundSeparator: v })} label="Add space around separator" />
            <Toggle checked={!!s.removeDimensionsFromName} onChange={(v) => set({ removeDimensionsFromName: v })} label="Remove dimensions from filename" />
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-medium text-muted mb-1.5">Your Naming Convention</div>
          <div className="min-h-[46px] border border-line rounded-lg p-2 flex flex-wrap gap-1.5 bg-surface">
            {tokens.length === 0 && <span className="text-xs text-muted px-1 py-1">Click tags above to build the name…</span>}
            {tokens.map((t, i) => (
              <span key={`${t}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-input border border-line text-xs text-fg">
                {t}
                <button onClick={() => removeToken(i)} className="text-muted hover:text-fg">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-muted mb-1.5">Preview</div>
          <div className="px-3 py-2 rounded-md border border-line bg-surface text-sm font-mono text-fg">{preview || '—'}</div>
        </div>

        <div className="mt-4">
          <SaveButton saving={saving === 'naming'} onClick={() => save(['namingTokens', 'namingSeparator', 'addSpaceAroundSeparator', 'removeDimensionsFromName'], 'naming')} />
        </div>
      </Section>
    </div>
  );
}
