import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const WS = 'seed-ecubate';

export function CreativesPage() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try { setCreatives(await api.creatives(WS)); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function sync() {
    setBusy(true); setErr('');
    try { await api.syncCreatives(WS, folderId.trim()); await load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-1">Creatives</h1>
      <p className="text-slate-500 text-sm mb-5">Sync a Google Drive folder of images/videos into your creative library.</p>

      <div className="flex gap-2 mb-6 max-w-xl">
        <input
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          placeholder="Google Drive folder ID"
          className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm"
        />
        <button onClick={sync} disabled={busy || !folderId} className="px-4 py-2 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-50">
          {busy ? 'Syncing…' : 'Sync from Drive'}
        </button>
      </div>

      {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {creatives.map((c) => (
          <div key={c.id} className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="aspect-square bg-slate-100 grid place-items-center text-3xl">
              {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt={c.filename} className="w-full h-full object-cover" /> : c.type === 'VIDEO' ? '🎬' : '🖼️'}
            </div>
            <div className="p-2 text-xs truncate" title={c.filename}>{c.filename}</div>
          </div>
        ))}
      </div>
      {creatives.length === 0 && !err && <p className="text-sm text-slate-400">No creatives yet.</p>}
    </div>
  );
}
