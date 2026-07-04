import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Film, Image as ImageIcon } from './icons';

export function LoadCreativesModal({ workspaceId, onClose, onLoad }: { workspaceId: string; onClose: () => void; onLoad: (creatives: any[]) => void }) {
  const [library, setLibrary] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try { setLibrary(await api.creatives(workspaceId)); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [workspaceId]);

  async function sync() {
    if (!folderId.trim()) return;
    setBusy(true); setErr('');
    try { await api.syncCreatives(workspaceId, folderId.trim()); await load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6" onClick={onClose}>
      <div className="w-full max-w-4xl h-[80vh] bg-bg border border-line rounded-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h2 className="font-semibold text-fg">Load Creatives</h2>
          <button onClick={onClose} className="text-muted hover:text-fg">✕</button>
        </div>

        <div className="px-5 py-3 border-b border-line flex gap-2 items-center">
          <span className="text-xs text-muted">Google Drive</span>
          <input value={folderId} onChange={(e) => setFolderId(e.target.value)} placeholder="Paste a Google Drive folder ID to sync"
            className="flex-1 px-3 py-1.5 rounded-md bg-input border border-line text-sm text-fg placeholder-muted" />
          <button onClick={sync} disabled={busy} className="px-3 py-1.5 rounded-md bg-surface border border-line text-sm hover:bg-hover disabled:opacity-50">
            {busy ? 'Syncing…' : 'Sync from Drive'}
          </button>
        </div>

        {err && <div className="px-5 py-2 text-sm text-red-400">{err}</div>}

        <div className="flex-1 overflow-y-auto p-5">
          {library.length === 0 ? (
            <div className="text-sm text-muted grid place-items-center h-full">No creatives yet — sync a Drive folder above.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {library.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button key={c.id} onClick={() => toggle(c.id)}
                    className={`relative border rounded-lg overflow-hidden text-left ${on ? 'border-primary ring-2 ring-primary/40' : 'border-line'}`}>
                    <div className="aspect-square bg-surface grid place-items-center text-muted">
                      {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="w-full h-full object-cover" /> : c.type === 'VIDEO' ? <Film size={26} /> : <ImageIcon size={26} />}
                    </div>
                    <div className="p-1.5 text-[11px] text-fg/80 truncate">{c.filename}</div>
                    {on && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] grid place-items-center">✓</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line flex items-center justify-between">
          <span className="text-sm text-muted">Selected {selected.size} Creatives</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3.5 py-2 rounded-md border border-line text-sm hover:bg-hover">Close</button>
            <button
              disabled={selected.size === 0}
              onClick={() => onLoad(library.filter((c) => selected.has(c.id)))}
              className="px-3.5 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50"
            >
              Load Creatives
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
