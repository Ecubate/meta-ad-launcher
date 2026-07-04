import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Rocket } from '../components/icons';

export function LoginPage() {
  const { refresh } = useAuth();
  const [cfg, setCfg] = useState<{ google: boolean; devLogin: boolean }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.authConfig().then(setCfg).catch(() => setCfg({ google: false, devLogin: true })); }, []);

  async function dev() {
    setBusy(true);
    try { await api.devLogin(); await refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="h-full grid place-items-center bg-bg text-fg">
      <div className="w-[360px] text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 text-white grid place-items-center mb-5">
          <Rocket size={26} />
        </div>
        <h1 className="text-xl font-semibold">Meta Ad Launcher</h1>
        <p className="text-sm text-muted mt-1 mb-7">Sign in to launch and manage your Meta ads.</p>

        {cfg?.google && (
          <a href="/api/auth/google" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-surface border border-line hover:bg-hover text-sm font-medium mb-3">
            <span className="text-[#4c9fff]">G</span> Continue with Google
          </a>
        )}

        {cfg?.devLogin && (
          <button onClick={dev} disabled={busy} className="w-full px-4 py-2.5 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
            {busy ? 'Signing in…' : 'Dev sign-in (local)'}
          </button>
        )}

        {!cfg && <div className="text-sm text-muted">Loading…</div>}
        <p className="text-xs text-muted mt-6">Google SSO activates once GOOGLE_CLIENT_ID/SECRET are set.</p>
      </div>
    </div>
  );
}
