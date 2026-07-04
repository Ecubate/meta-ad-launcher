import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from './api';

type AdAccount = { id: string; name: string; metaAccountId: string; currency: string; settings?: any };
type Workspace = { id: string; name: string; adAccounts: AdAccount[] };

type Ctx = {
  workspace?: Workspace;
  account?: AdAccount;
  loading: boolean;
  error?: string;
  reloadAccount: () => Promise<void>;
};

const AccountContext = createContext<Ctx>({ loading: true, reloadAccount: async () => {} });

export function AccountProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [account, setAccount] = useState<AdAccount>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reloadAccount = useCallback(async () => {
    if (!account) return;
    setAccount(await api.adAccount(account.id));
  }, [account?.id]);

  useEffect(() => {
    (async () => {
      try {
        const ws = await api.workspaces();
        const first = ws[0];
        setWorkspace(first);
        if (first?.adAccounts?.[0]) {
          setAccount(await api.adAccount(first.adAccounts[0].id));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AccountContext.Provider value={{ workspace, account, loading, error, reloadAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);
