import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

type User = { id: string; name: string; email: string; picture?: string };
type Ctx = { user?: User; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };

const AuthContext = createContext<Ctx>({ loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try { setUser(await api.me()); } catch { setUser(undefined); } finally { setLoading(false); }
  }
  async function logout() { await api.logout(); setUser(undefined); }

  useEffect(() => { refresh(); }, []);

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
