import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';
import { Field, Input } from '../components/ui';

const CTA = ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'BUY_NOW', 'GET_OFFER', 'DOWNLOAD', 'CONTACT_US'];

function CreateModal({ accountId, onClose, onCreated }: { accountId: string; onClose: () => void; onCreated: () => void }) {
  const [v, setV] = useState<any>({ name: '', primaryText: '', headline: '', description: '', ctaType: 'LEARN_MORE', url: '', displayLink: '', customStoreListingId: '', utmParams: '' });
  const [busy, setBusy] = useState(false);
  const set = (p: any) => setV((s: any) => ({ ...s, ...p }));

  async function create() {
    if (!v.name) return;
    setBusy(true);
    try {
      await api.createTemplate(accountId, {
        name: v.name, primaryTexts: [v.primaryText].filter(Boolean), headlines: [v.headline].filter(Boolean), descriptions: [v.description].filter(Boolean),
        ctaType: v.ctaType, url: v.url, displayLink: v.displayLink, customStoreListingId: v.customStoreListingId, utmParams: v.utmParams,
      });
      onCreated(); onClose();
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-bg border border-line rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-fg">Create Ad Copy Template</h2>
          <button onClick={onClose} className="text-muted hover:text-fg">✕</button>
        </div>
        <Field label="Template Name *"><Input value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Untitled Template" /></Field>
        <h3 className="text-sm font-semibold text-fg mt-6 mb-2">Ad Copy</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary Text"><textarea value={v.primaryText} onChange={(e) => set({ primaryText: e.target.value })} rows={2} placeholder="Enter primary text" className="cell" /></Field>
          <Field label="Headline (Optional)"><Input value={v.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Enter headline" /></Field>
          <Field label="Ad Description"><textarea value={v.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="Write ad description" className="cell" /></Field>
          <Field label="CTA">
            <select value={v.ctaType} onChange={(e) => set({ ctaType: e.target.value })} className="w-full px-3 py-2 rounded-md bg-input border border-line text-sm text-fg">
              {CTA.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </div>
        <h3 className="text-sm font-semibold text-fg mt-6 mb-2">Web Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Web Link"><Input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://example.com" /></Field>
          <Field label="Display Link"><Input value={v.displayLink} onChange={(e) => set({ displayLink: e.target.value })} placeholder="https://example.com" /></Field>
          <Field label="Custom Product Page / Store Listing ID"><Input value={v.customStoreListingId} onChange={(e) => set({ customStoreListingId: e.target.value })} placeholder="Enter the ID only" /></Field>
          <Field label="UTM Parameters"><Input value={v.utmParams} onChange={(e) => set({ utmParams: e.target.value })} placeholder="utm_source=meta" /></Field>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={create} disabled={busy || !v.name} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">{busy ? 'Creating…' : 'Create Template'}</button>
        </div>
      </div>
    </div>
  );
}

export function AdCopyTemplatesPage() {
  const { account } = useAccount();
  const [templates, setTemplates] = useState<any[]>([]);
  const [modal, setModal] = useState(false);

  async function load() { if (account) setTemplates(await api.adCopyTemplates(account.id)); }
  useEffect(() => { load(); }, [account?.id]);

  return (
    <div className="px-8 pb-16">
      <div className="py-6 border-b border-line flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Ad Copy Templates</h1>
          <p className="text-sm text-muted mt-1">Manage and organize your ad copy, CTA & links using templates.</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium">+ Create New Template</button>
      </div>

      {templates.length === 0 ? (
        <div className="grid place-items-center py-24 text-center">
          <div>
            <h3 className="text-fg font-semibold">No Ad Copy Templates Found</h3>
            <p className="text-muted text-sm mt-1 mb-4">Create ad copy templates to organize your ad copy.</p>
            <button onClick={() => setModal(true)} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium">+ Create New Template</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {templates.map((t) => (
            <div key={t.id} className="border border-line rounded-xl p-4 bg-surface/40">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-fg">{t.name}</h3>
                <button onClick={async () => { await api.deleteTemplate(t.id); load(); }} className="text-muted hover:text-red-400 text-sm">🗑</button>
              </div>
              <p className="text-xs text-muted mt-2 line-clamp-2">{t.primaryTexts?.[0] ?? 'No primary text'}</p>
              <div className="text-[11px] text-muted mt-3">{t.ctaType?.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
      )}

      {modal && account && <CreateModal accountId={account.id} onClose={() => setModal(false)} onCreated={load} />}
    </div>
  );
}
