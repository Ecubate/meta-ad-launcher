import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';
import { LoadCreativesModal } from '../components/LoadCreativesModal';
import { Film, Image as ImageIcon, Rocket } from '../components/icons';

const CTA_TYPES = ['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'SUBSCRIBE', 'BUY_NOW', 'GET_OFFER', 'DOWNLOAD', 'CONTACT_US', 'ORDER_NOW', 'BOOK_TRAVEL', 'GET_QUOTE', 'APPLY_NOW', 'SEE_MORE'];

type Row = {
  key: string;
  creativeId: string;
  filename: string;
  type: string;
  thumbnailUrl?: string;
  adName: string;
  primaryTexts: string[];
  headlines: string[];
  description: string;
  url: string;
  ctaType: string;
  adSetId: string;
  displayLink: string;
};

const stripExt = (f: string) => f.replace(/\.[a-z0-9]+$/i, '');

export function LaunchTablePage() {
  const { workspace, account } = useAccount();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [modal, setModal] = useState(false);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [batchName, setBatchName] = useState('New Launch');
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Reopen a saved draft into the table (?draft=<batchId>).
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (!draftId || !workspace) return;
    (async () => {
      const [batch, creatives] = await Promise.all([api.batch(draftId), api.creatives(workspace.id)]);
      const byId = new Map(creatives.map((c: any) => [c.id, c]));
      setBatchName(batch.name);
      setRows(
        (batch.payload?.rows ?? []).map((r: any, i: number) => {
          const c: any = byId.get(r.creativeId) ?? {};
          return {
            key: `${r.creativeId}-draft-${i}`, creativeId: r.creativeId,
            filename: c.filename ?? r.creativeId, type: c.type ?? 'IMAGE', thumbnailUrl: c.thumbnailUrl,
            adName: r.adName ?? '',
            primaryTexts: r.primaryTexts?.length ? r.primaryTexts : [r.primaryText ?? ''],
            headlines: r.headlines?.length ? r.headlines : [r.headline ?? ''],
            description: r.description ?? '', url: r.url ?? '', ctaType: r.ctaType ?? 'SHOP_NOW',
            adSetId: r.existingAdsetId ?? '', displayLink: '',
          };
        }),
      );
    })().catch(() => {});
  }, [searchParams, workspace?.id]);

  useEffect(() => {
    if (!account) return;
    api.adSets(account.id).then((r) => setAdsets(r.adsets)).catch(() => {});
    api.adCopyTemplates(account.id).then(setTemplates).catch(() => {});
  }, [account?.id]);

  function addCreatives(creatives: any[]) {
    setRows((prev) => [
      ...prev,
      ...creatives.map((c) => ({
        key: `${c.id}-${prev.length}-${c.filename}`,
        creativeId: c.id,
        filename: c.filename,
        type: c.type,
        thumbnailUrl: c.thumbnailUrl,
        adName: stripExt(c.filename),
        primaryTexts: [''],
        headlines: [''],
        description: '',
        url: '',
        ctaType: 'SHOP_NOW',
        adSetId: '',
        displayLink: '',
      })),
    ]);
    setModal(false);
  }

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  // Variation helpers for the primaryTexts / headlines arrays.
  const setVar = (key: string, field: 'primaryTexts' | 'headlines', i: number, val: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: r[field].map((v, idx) => (idx === i ? val : v)) } : r)));
  const addVar = (key: string, field: 'primaryTexts' | 'headlines') =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: [...r[field], ''] } : r)));
  const removeVar = (key: string, field: 'primaryTexts' | 'headlines', i: number) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: r[field].filter((_, idx) => idx !== i) } : r)));
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const duplicate = (key: string) => setRows((rs) => {
    const i = rs.findIndex((r) => r.key === key);
    if (i < 0) return rs;
    const copy = { ...rs[i], key: `${rs[i].key}-copy-${rs.length}` };
    return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
  });

  function applyTemplate(tid: string) {
    const t = templates.find((x) => x.id === tid);
    if (!t) return;
    setRows((rs) => rs.map((r) => ({
      ...r,
      primaryTexts: t.primaryTexts?.length ? t.primaryTexts : r.primaryTexts,
      headlines: t.headlines?.length ? t.headlines : r.headlines,
      description: t.descriptions?.[0] ?? r.description,
      url: t.url ?? r.url,
      ctaType: t.ctaType ?? r.ctaType,
      displayLink: t.displayLink ?? r.displayLink,
      adSetId: t.adSetId ?? r.adSetId,
    })));
  }

  function payload() {
    return {
      rows: rows.map((r) => ({
        creativeId: r.creativeId,
        adName: r.adName,
        primaryTexts: r.primaryTexts.filter((t) => t.trim() !== ''),
        headlines: r.headlines.filter((t) => t.trim() !== ''),
        description: r.description,
        url: r.url || 'https://example.com',
        ctaType: r.ctaType,
        existingAdsetId: r.adSetId || undefined,
      })),
    };
  }

  async function saveDraft() {
    if (!account) return;
    await api.saveDraft(account.id, { name: batchName, payload: payload() });
    setResult({ draft: true });
  }

  async function launch() {
    if (!account || rows.length === 0) return;
    setLaunching(true); setResult(null);
    try {
      const batch = await api.launch(account.id, { name: batchName, payload: payload() });
      // poll until complete
      for (let i = 0; i < 30; i++) {
        const b = await api.batch(batch.id);
        if (b.status === 'COMPLETED' || b.status === 'FAILED') {
          const created = b.ads.filter((a: any) => a.status === 'CREATED').length;
          const errored = b.ads.filter((a: any) => a.status === 'ERROR').length;
          const dry = b.ads.some((a: any) => a.error?.includes('DRY-RUN'));
          setResult({ created, errored, dry, ads: b.ads });
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    } finally {
      setLaunching(false);
    }
  }

  // Total ads = sum over rows of (primary-text variations × headline variations).
  const adCount = rows.reduce((n, r) => {
    const p = Math.max(1, r.primaryTexts.filter((t) => t.trim()).length);
    const h = Math.max(1, r.headlines.filter((t) => t.trim()).length);
    return n + p * h;
  }, 0);

  const visibleRows = search.trim()
    ? rows.filter((r) => r.adName.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  if (rows.length === 0) {
    return (
      <div className="h-full grid place-items-center">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-surface border border-line grid place-items-center mb-5 text-primary"><Rocket size={34} /></div>
          <h1 className="text-lg font-semibold text-fg">Launch Ads</h1>
          <p className="text-muted text-sm mt-1 mb-5">Load creatives to start building your bulk launch.</p>
          <button onClick={() => setModal(true)} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium">Load Creatives</button>
        </div>
        {modal && workspace && <LoadCreativesModal workspaceId={workspace.id} onClose={() => setModal(false)} onLoad={addCreatives} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-line">
        <h1 className="text-lg font-semibold text-fg">Launch Ads</h1>
        <input value={batchName} onChange={(e) => setBatchName(e.target.value)} className="px-3 py-1.5 rounded-md bg-input border border-line text-sm text-fg w-40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ad name"
          className="px-3 py-1.5 rounded-md bg-input border border-line text-sm text-fg w-52" />
        <div className="ml-auto flex items-center gap-2">
          <select onChange={(e) => e.target.value && applyTemplate(e.target.value)} defaultValue=""
            className="px-3 py-1.5 rounded-md bg-surface border border-line text-sm text-fg">
            <option value="">Load Templates</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={() => setModal(true)} className="px-3 py-1.5 rounded-md bg-surface border border-line text-sm hover:bg-hover">+ Creatives</button>
          <button onClick={saveDraft} className="px-3 py-1.5 rounded-md bg-surface border border-line text-sm hover:bg-hover">Save Draft</button>
          <button onClick={launch} disabled={launching} className="px-4 py-1.5 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
            {launching ? 'Launching…' : `Launch ${adCount} Ad${adCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      {result && (
        <div className={`px-6 py-2.5 text-sm border-b border-line ${result.errored ? 'text-amber-300' : 'text-emerald-300'}`}>
          {result.draft ? 'Draft saved.' : `Launched: ${result.created} created${result.errored ? `, ${result.errored} errored` : ''}${result.dry ? ' — DRY-RUN (no Meta token; nothing sent to Meta)' : ''}.`}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-side z-10">
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Creative</th>
              <th className="px-3 py-2 font-medium">Ad Name</th>
              <th className="px-3 py-2 font-medium">Primary Text</th>
              <th className="px-3 py-2 font-medium">Headline</th>
              <th className="px-3 py-2 font-medium">Link</th>
              <th className="px-3 py-2 font-medium">CTA</th>
              <th className="px-3 py-2 font-medium">Ad Set</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => (
              <tr key={r.key} className="border-t border-line align-top">
                <td className="px-3 py-3 w-24">
                  <div className="w-16 h-16 rounded-md bg-surface border border-line grid place-items-center overflow-hidden text-muted">
                    {r.thumbnailUrl ? <img src={r.thumbnailUrl} className="w-full h-full object-cover" /> : r.type === 'VIDEO' ? <Film size={22} /> : <ImageIcon size={22} />}
                  </div>
                  <span className="text-[10px] text-muted">{r.type === 'VIDEO' ? 'Video' : 'Image'}</span>
                </td>
                <td className="px-3 py-3 w-40"><textarea value={r.adName} onChange={(e) => update(r.key, { adName: e.target.value })} rows={2} className="cell" /></td>
                <td className="px-3 py-3 w-56">
                  {r.primaryTexts.map((t, i) => (
                    <div key={i} className="relative mb-1.5">
                      <textarea value={t} onChange={(e) => setVar(r.key, 'primaryTexts', i, e.target.value)} rows={2} placeholder={i === 0 ? 'Enter primary text' : `Variation ${i + 1}`} className="cell" />
                      {i > 0 && <button onClick={() => removeVar(r.key, 'primaryTexts', i)} className="absolute top-1 right-1 text-muted hover:text-red-400 text-xs">×</button>}
                    </div>
                  ))}
                  <button onClick={() => addVar(r.key, 'primaryTexts')} className="text-[11px] text-primary hover:underline">+ Add Primary Text Variation</button>
                </td>
                <td className="px-3 py-3 w-44">
                  {r.headlines.map((t, i) => (
                    <div key={i} className="relative mb-1.5">
                      <input value={t} onChange={(e) => setVar(r.key, 'headlines', i, e.target.value)} placeholder={i === 0 ? 'Enter headline' : `Variation ${i + 1}`} className="cell pr-5" />
                      {i > 0 && <button onClick={() => removeVar(r.key, 'headlines', i)} className="absolute top-1.5 right-1 text-muted hover:text-red-400 text-xs">×</button>}
                    </div>
                  ))}
                  <button onClick={() => addVar(r.key, 'headlines')} className="text-[11px] text-primary hover:underline">+ Add Headline Variation</button>
                </td>
                <td className="px-3 py-3 w-44"><input value={r.url} onChange={(e) => update(r.key, { url: e.target.value })} placeholder="https://example.com" className="cell" /></td>
                <td className="px-3 py-3 w-36">
                  <select value={r.ctaType} onChange={(e) => update(r.key, { ctaType: e.target.value })} className="cell">
                    {CTA_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="px-3 py-3 w-48">
                  <select value={r.adSetId} onChange={(e) => update(r.key, { adSetId: e.target.value })} className="cell">
                    <option value="">New campaign + ad set</option>
                    {adsets.map((a) => <option key={a.id} value={a.id}>{a.name}{a.campaign?.name ? ` · ${a.campaign.name}` : ''}</option>)}
                  </select>
                </td>
                <td className="px-3 py-3 w-56"><textarea value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} rows={2} placeholder="Enter ad description" className="cell" /></td>
                <td className="px-3 py-3 w-20">
                  <div className="flex gap-1.5 text-muted">
                    <button onClick={() => duplicate(r.key)} title="Duplicate" className="hover:text-fg">⧉</button>
                    <button onClick={() => remove(r.key)} title="Delete" className="hover:text-red-400">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-2.5 border-t border-line text-sm text-muted">{rows.length} creative{rows.length === 1 ? '' : 's'} → {adCount} ad{adCount === 1 ? '' : 's'} · Ad profile: {account?.settings?.facebookPageName ?? '—'}</div>

      {modal && workspace && <LoadCreativesModal workspaceId={workspace.id} onClose={() => setModal(false)} onLoad={addCreatives} />}
    </div>
  );
}
