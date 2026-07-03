const BASE = import.meta.env.VITE_API_BASE ?? '';

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => req<{ ok: boolean; metaVersion: string }>('/health'),
  workspaces: () => req<any[]>('/workspaces'),
  createWorkspace: (name: string) => req('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  adAccount: (id: string) => req<any>(`/ad-accounts/${id}`),
  saveSettings: (id: string, data: any) =>
    req(`/ad-accounts/${id}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
  pages: (id: string) => req<any[]>(`/ad-accounts/${id}/meta/pages`),
  pixels: (id: string) => req<any[]>(`/ad-accounts/${id}/meta/pixels`),
  namingPreview: (body: any) => req<{ preview: string }>('/naming/preview', { method: 'POST', body: JSON.stringify(body) }),
  creatives: (wsId: string) => req<any[]>(`/workspaces/${wsId}/creatives`),
  syncCreatives: (wsId: string, folderId: string) =>
    req<any[]>(`/workspaces/${wsId}/creatives/sync`, { method: 'POST', body: JSON.stringify({ folderId }) }),
  launch: (accountId: string, body: any) =>
    req<any>(`/ad-accounts/${accountId}/launch`, { method: 'POST', body: JSON.stringify(body) }),
  batch: (id: string) => req<any>(`/batches/${id}`),
  launchedAds: (accountId: string) => req<any[]>(`/ad-accounts/${accountId}/launched-ads`),
};
