import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * "Connect Facebook" flow: opens the Facebook OAuth popup, waits for it to
 * post back, then lists the token's ad accounts so the user can link one.
 */
export function ConnectMetaModal({ workspaceId, onClose, onConnected }: { workspaceId: string; onClose: () => void; onConnected: () => void }) {
  const [cfg, setCfg] = useState<{ configured: boolean; url?: string }>();
  const [accounts, setAccounts] = useState<any[]>();
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api.metaOauthUrl().then(setCfg).catch((e) => setErr(e.message)); }, []);

  // When the OAuth popup finishes it postMessages "meta-connected".
  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (e.data === 'meta-connected') {
        setBusy('accounts');
        try { setAccounts(await api.metaAccounts()); } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function connect() {
    if (cfg?.url) window.open(cfg.url, 'meta-oauth', 'width=560,height=680');
  }

  async function link(a: any) {
    setBusy(a.metaAccountId); setErr('');
    try {
      await api.connectMeta(workspaceId, { metaAccountId: a.metaAccountId, name: a.name, currency: a.currency });
      onConnected();
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6" onClick={onClose}>
      <div className="w-full max-w-lg bg-bg border border-line rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h2 className="font-semibold text-fg">Connect Facebook</h2>
          <button onClick={onClose} className="text-muted hover:text-fg">✕</button>
        </div>

        <div className="p-5">
          {cfg && !cfg.configured && (
            <div className="text-sm text-muted">
              The Meta app isn’t configured for login yet. Set <code className="text-fg">META_APP_ID</code> and{' '}
              <code className="text-fg">META_APP_SECRET</code> in <code className="text-fg">server/.env</code>, and register the
              redirect URI in the app’s Facebook Login settings. Then reload.
            </div>
          )}

          {cfg?.configured && !accounts && (
            <div className="text-center py-4">
              <p className="text-sm text-muted mb-4">Authorize the tool to manage your Meta ad accounts.</p>
              <button onClick={connect} className="px-4 py-2 rounded-md bg-[#1877F2] text-white text-sm font-medium">
                {busy === 'accounts' ? 'Loading accounts…' : 'Continue with Facebook'}
              </button>
            </div>
          )}

          {accounts && (
            <div>
              <p className="text-sm text-muted mb-3">Select an ad account to link to this workspace:</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {accounts.map((a) => (
                  <button key={a.metaAccountId} onClick={() => link(a)} disabled={!!busy}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-line bg-surface hover:bg-hover text-left disabled:opacity-50">
                    <span className="text-sm text-fg">{a.name}</span>
                    <span className="text-xs text-muted">act_{a.metaAccountId} · {a.currency}</span>
                  </button>
                ))}
                {accounts.length === 0 && <div className="text-sm text-muted">No ad accounts found for this login.</div>}
              </div>
            </div>
          )}

          {err && <div className="text-sm text-red-400 mt-3">{err}</div>}
          {!cfg && <div className="text-sm text-muted">Loading…</div>}
        </div>
      </div>
    </div>
  );
}
