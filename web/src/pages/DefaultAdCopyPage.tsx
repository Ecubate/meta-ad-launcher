import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';
import { Field, Input } from '../components/ui';

const CTA = ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'BUY_NOW', 'GET_OFFER', 'DOWNLOAD', 'CONTACT_US', 'BOOK_TRAVEL'];

export function DefaultAdCopyPage() {
  const { account } = useAccount();
  const [v, setV] = useState<any>({ primaryTexts: [''], headlines: [''], description: '', ctaType: 'LEARN_MORE', url: '', displayLink: '', customStoreListingId: '', utmParams: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!account) return;
    api.defaultAdCopy(account.id).then((d) => {
      if (d) setV({
        primaryTexts: d.primaryTexts?.length ? d.primaryTexts : [''],
        headlines: d.headlines?.length ? d.headlines : [''],
        description: d.descriptions?.[0] ?? '',
        ctaType: d.ctaType ?? 'LEARN_MORE',
        url: d.url ?? '', displayLink: d.displayLink ?? '', customStoreListingId: d.customStoreListingId ?? '', utmParams: d.utmParams ?? '',
      });
    }).catch(() => {});
  }, [account?.id]);

  const set = (patch: any) => { setV((p: any) => ({ ...p, ...patch })); setSaved(false); };
  const setArr = (k: string, i: number, val: string) => set({ [k]: v[k].map((x: string, idx: number) => (idx === i ? val : x)) });

  async function save() {
    if (!account) return;
    await api.saveDefaultAdCopy(account.id, {
      primaryTexts: v.primaryTexts.filter(Boolean), headlines: v.headlines.filter(Boolean), descriptions: [v.description],
      ctaType: v.ctaType, url: v.url, displayLink: v.displayLink, customStoreListingId: v.customStoreListingId, utmParams: v.utmParams,
    });
    setSaved(true);
  }

  return (
    <div className="px-8 pb-16">
      <div className="py-6 border-b border-line flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Default Ad Copy</h1>
          <p className="text-sm text-muted mt-1">Manage default ad copy, CTA & links applied to new launches.</p>
        </div>
        <button onClick={save} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium">{saved ? 'Saved ✓' : 'Save'}</button>
      </div>

      <section className="grid grid-cols-2 gap-8 py-8 border-b border-line">
        <div><h2 className="text-base font-semibold text-fg">Ad Copy</h2></div>
        <div className="space-y-4">
          <Field label="Primary Text">
            {v.primaryTexts.map((t: string, i: number) => (
              <textarea key={i} value={t} onChange={(e) => setArr('primaryTexts', i, e.target.value)} rows={2} placeholder="Enter primary text" className="cell mb-2" />
            ))}
            <button onClick={() => set({ primaryTexts: [...v.primaryTexts, ''] })} className="text-xs text-primary">+ Add Primary Text</button>
          </Field>
          <Field label="Headline">
            {v.headlines.map((t: string, i: number) => (
              <Input key={i} value={t} onChange={(e) => setArr('headlines', i, e.target.value)} placeholder="Enter headline" className="mb-2" />
            ))}
            <button onClick={() => set({ headlines: [...v.headlines, ''] })} className="text-xs text-primary">+ Add Headline</button>
          </Field>
          <Field label="Description"><textarea value={v.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="Write ad description" className="cell" /></Field>
          <Field label="CTA">
            <select value={v.ctaType} onChange={(e) => set({ ctaType: e.target.value })} className="w-full px-3 py-2 rounded-md bg-input border border-line text-sm text-fg">
              {CTA.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-8 py-8">
        <div><h2 className="text-base font-semibold text-fg">Web Links</h2></div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Web Link"><Input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://example.com" /></Field>
          <Field label="Display Link"><Input value={v.displayLink} onChange={(e) => set({ displayLink: e.target.value })} placeholder="https://example.com" /></Field>
          <Field label="Custom Product Page / Store Listing ID"><Input value={v.customStoreListingId} onChange={(e) => set({ customStoreListingId: e.target.value })} placeholder="Enter the ID only (not a URL)" /></Field>
          <Field label="UTM Parameters"><Input value={v.utmParams} onChange={(e) => set({ utmParams: e.target.value })} placeholder="utm_source=meta" /></Field>
        </div>
      </section>
    </div>
  );
}
