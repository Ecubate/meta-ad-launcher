const BASE = import.meta.env.VITE_API_BASE ?? '';

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error ?? `API ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export const api = {
  // auth
  authConfig: () => req<{ google: boolean; devLogin: boolean }>('/auth/config'),
  me: () => req<{ id: string; name: string; email: string; picture?: string }>('/auth/me'),
  devLogin: () => req('/auth/dev-login', { method: 'POST' }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  // core
  health: () => req<{ ok: boolean; metaVersion: string }>('/health'),
  workspaces: () => req<any[]>('/workspaces'),
  adAccount: (id: string) => req<any>(`/ad-accounts/${id}`),
  saveSettings: (id: string, data: any) => req(`/ad-accounts/${id}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
  pages: (id: string) => req<any[]>(`/ad-accounts/${id}/meta/pages`),
  pixels: (id: string) => req<any[]>(`/ad-accounts/${id}/meta/pixels`),
  adSets: (id: string) => req<{ adsets: any[]; note?: string }>(`/ad-accounts/${id}/meta/adsets`),
  namingPreview: (body: any) => req<{ preview: string }>('/naming/preview', { method: 'POST', body: JSON.stringify(body) }),

  // creatives
  creatives: (wsId: string) => req<any[]>(`/workspaces/${wsId}/creatives`),
  syncCreatives: (wsId: string, folderId: string) => req<any[]>(`/workspaces/${wsId}/creatives/sync`, { method: 'POST', body: JSON.stringify({ folderId }) }),

  // ad copy
  adCopyTemplates: (id: string) => req<any[]>(`/ad-accounts/${id}/ad-copy-templates`),
  createTemplate: (id: string, body: any) => req(`/ad-accounts/${id}/ad-copy-templates`, { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (tid: string, body: any) => req(`/ad-copy-templates/${tid}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTemplate: (tid: string) => req(`/ad-copy-templates/${tid}`, { method: 'DELETE' }),
  defaultAdCopy: (id: string) => req<any>(`/ad-accounts/${id}/default-ad-copy`),
  saveDefaultAdCopy: (id: string, body: any) => req(`/ad-accounts/${id}/default-ad-copy`, { method: 'PUT', body: JSON.stringify(body) }),

  // launch
  launch: (accountId: string, body: any) => req<any>(`/ad-accounts/${accountId}/launch`, { method: 'POST', body: JSON.stringify(body) }),
  saveDraft: (accountId: string, body: any) => req<any>(`/ad-accounts/${accountId}/drafts`, { method: 'POST', body: JSON.stringify(body) }),
  drafts: (accountId: string) => req<any[]>(`/ad-accounts/${accountId}/drafts`),
  batch: (id: string) => req<any>(`/batches/${id}`),
  launchedAds: (accountId: string) => req<any[]>(`/ad-accounts/${accountId}/launched-ads`),
};
