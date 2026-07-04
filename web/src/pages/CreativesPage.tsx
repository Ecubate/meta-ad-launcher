import { useEffect, useState } from 'react';
import { Film, Image as ImageIcon } from '../components/icons';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';

export function CreativesPage() {
  const { workspace } = useAccount();
  const [creatives, setCreatives] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    if (!workspace) return;
    try { setCreatives(await api.creatives(workspace.id)); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [workspace?.id]);

  async function sync() {
    if (!workspace) return;
    setBusy(true); setErr('');
    try { await api.syncCreatives(workspace.id, folderId.trim()); await load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-fg mb-1">Creatives</h1>
      <p className="text-muted text-sm mb-5">Sync a Google Drive folder of images/videos into your creative library.</p>

      <div className="flex gap-2 mb-6 max-w-xl">
        <input
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          placeholder="Google Drive folder ID"
          className="flex-1 px-3 py-2 rounded-md bg-input border border-line text-sm text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button onClick={sync} disabled={busy || !folderId} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
          {busy ? 'Syncing…' : 'Sync from Drive'}
        </button>
      </div>

      {err && <div className="text-sm text-red-400 mb-4">{err}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {creatives.map((c) => (
          <div key={c.id} className="border border-line rounded-lg overflow-hidden bg-surface">
            <div className="aspect-square bg-bg grid place-items-center text-muted">
              {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt={c.filename} className="w-full h-full object-cover" /> : c.type === 'VIDEO' ? <Film size={28} /> : <ImageIcon size={28} />}
            </div>
            <div className="p-2 text-xs text-fg/80 truncate" title={c.filename}>{c.filename}</div>
          </div>
        ))}
      </div>
      {creatives.length === 0 && !err && <p className="text-sm text-muted">No creatives yet.</p>}
    </div>
  );
}
