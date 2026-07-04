import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';

export function DraftsPage() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => { if (account) api.drafts(account.id).then(setDrafts).catch(() => {}); }, [account?.id]);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-fg mb-1">Drafts</h1>
      <p className="text-muted text-sm mb-5">Saved launches you can reopen and launch later.</p>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted">No drafts yet. Use “Save Draft” on the Launch screen.</p>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center justify-between border border-line rounded-lg px-4 py-3 bg-surface/40">
              <div>
                <div className="text-fg font-medium">{d.name}</div>
                <div className="text-xs text-muted">{d.payload?.rows?.length ?? 0} creatives</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-500/15 text-slate-300">DRAFT</span>
                <button onClick={() => navigate(`/launch?draft=${d.id}`)} className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium">Open</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
