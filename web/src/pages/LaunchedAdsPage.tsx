import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAccount } from '../lib/account';

const badge = (s: string) => {
  const map: Record<string, string> = { CREATED: 'bg-emerald-500/15 text-emerald-300', ERROR: 'bg-red-500/15 text-red-300', PENDING: 'bg-amber-500/15 text-amber-300' };
  return map[s] ?? 'bg-slate-500/15 text-slate-300';
};

export function LaunchedAdsPage() {
  const { account } = useAccount();
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => { if (account) api.launchedAds(account.id).then(setAds).catch(() => {}); }, [account?.id]);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-fg mb-1">Launched Ads</h1>
      <p className="text-muted text-sm mb-5">Ads created through the launcher and their Meta status.</p>

      {ads.length === 0 ? (
        <p className="text-sm text-muted">No launched ads yet. Build a launch on the Launch screen.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              <th className="px-3 py-2 font-medium">Ad Name</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Batch</th>
              <th className="px-3 py-2 font-medium">Meta Ad ID</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.id} className="border-b border-line">
                <td className="px-3 py-2.5 text-fg">{a.name}</td>
                <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-xs ${badge(a.status)}`}>{a.status}</span></td>
                <td className="px-3 py-2.5 text-muted">{a.batch?.name}</td>
                <td className="px-3 py-2.5 text-muted font-mono text-xs">{a.metaAdId ?? '—'}</td>
                <td className="px-3 py-2.5 text-muted text-xs max-w-xs truncate" title={a.error ?? ''}>{a.error ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
