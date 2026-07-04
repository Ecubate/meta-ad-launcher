import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Film, Image as ImageIcon } from './icons';

export function LoadCreativesModal({ workspaceId, onClose, onLoad }: { workspaceId: string; onClose: () => void; onLoad: (creatives: any[]) => void }) {
  const [library, setLibrary] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  const [links, setLinks] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);

  async function load() {
    try { setLibrary(await api.creatives(workspaceId)); } catch (e: any) { setErr(e.message); }
  }
  async function checkConn() {
    try { setConnected((await api.driveStatus()).connected); } catch { setConnected(false); }
  }
  useEffect(() => { load(); checkConn(); }, [workspaceId]);

  async function connectDrive() {
    try {
      const { url } = await api.driveAuthUrl();
      window.open(url, 'drive-oauth', 'width=520,height=640');
      // Poll for the connection to complete.
      const iv = setInterval(async () => {
        const { connected } = await api.driveStatus();
        if (connected) { setConnected(true); clearInterval(iv); }
      }, 2000);
      setTimeout(() => clearInterval(iv), 120000);
    } catch (e: any) { setErr(e.message); }
  }

  async function syncFolder() {
    if (!folderId.trim()) return;
    setBusy('folder'); setErr(''); setNote('');
    try { const r = await api.syncCreatives(workspaceId, folderId.trim()); await load(); setNote(`Synced ${r.length} creative(s) from folder.`); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function addLinks() {
    if (!links.trim()) return;
    setBusy('links'); setErr(''); setNote('');
    try {
      const r = await api.creativesFromLinks(workspaceId, links);
      await load();
      setLinks('');
      setNote(`Added ${r.created.length} of ${r.parsed} link(s)${r.errors.length ? `, ${r.errors.length} failed` : ''}.`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6" onClick={onClose}>
      <div className="w-full max-w-4xl h-[82vh] bg-bg border border-line rounded-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h2 className="font-semibold text-fg">Load Creatives</h2>
          <button onClick={onClose} className="text-muted hover:text-fg">✕</button>
        </div>

        {/* Google Drive source */}
        <div className="px-5 py-3 border-b border-line space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted w-28">Google Drive</span>
            {connected === false ? (
              <button onClick={connectDrive} className="px-3 py-1.5 rounded-md bg-[#1877F2] text-white text-sm font-medium">Connect Google Drive</button>
            ) : (
              <span className="text-xs text-emerald-300">{connected === null ? 'Checking…' : '✓ Connected'}</span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <input value={folderId} onChange={(e) => setFolderId(e.target.value)} placeholder="Paste a Drive folder ID to sync all files"
              className="flex-1 px-3 py-1.5 rounded-md bg-input border border-line text-sm text-fg placeholder-muted" />
            <button onClick={syncFolder} disabled={!!busy} className="px-3 py-1.5 rounded-md bg-surface border border-line text-sm hover:bg-hover disabled:opacity-50">
              {busy === 'folder' ? 'Syncing…' : 'Sync Folder'}
            </button>
          </div>

          <div>
            <div className="text-xs text-muted mb-1">Add Google Drive Links in Bulk — paste up to 100 links (spaces, commas, or new lines).</div>
            <div className="flex gap-2 items-start">
              <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={2} placeholder="https://drive.google.com/file/d/…"
                className="flex-1 px-3 py-1.5 rounded-md bg-input border border-line text-sm text-fg placeholder-muted resize-none" />
              <button onClick={addLinks} disabled={!!busy || !links.trim()} className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
                {busy === 'links' ? 'Adding…' : 'Submit'}
              </button>
            </div>
          </div>

          {note && <div className="text-xs text-emerald-300">{note}</div>}
          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>

        {/* Library */}
        <div className="flex-1 overflow-y-auto p-5">
          {library.length === 0 ? (
            <div className="text-sm text-muted grid place-items-center h-full">No creatives yet — connect Drive and add links or a folder above.</div>
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
