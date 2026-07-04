import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Rocket, Users, Image as ImageIcon, TrendingUp, FileText, Pencil, Files,
  Sparkles, LayoutGrid, Settings, HelpCircle, ChevronDown, Megaphone, FolderOpen, BarChart3, LogOut,
  type Icon as IconType,
} from './icons';
import { useAccount } from '../lib/account';
import { useAuth } from '../lib/auth';

type Item = { to: string; label: string; icon: IconType };
const navGroups: { label: string; items: Item[] }[] = [
  {
    label: 'Launch',
    items: [
      { to: '/launch', label: 'Launch', icon: Rocket },
      { to: '/partnership', label: 'Partnership Ads', icon: Users },
      { to: '/creatives', label: 'Creatives', icon: ImageIcon },
      { to: '/launched', label: 'Launched Ads', icon: TrendingUp },
      { to: '/drafts', label: 'Drafts', icon: FileText },
    ],
  },
  {
    label: 'Ad Copy',
    items: [
      { to: '/ad-copy/default', label: 'Default Ad Copy', icon: Pencil },
      { to: '/ad-copy/templates', label: 'Ad Copy Templates', icon: Files },
    ],
  },
  {
    label: 'Setup',
    items: [
      { to: '/setup/enhancements', label: 'Creative Enhancements', icon: Sparkles },
      { to: '/setup/placements', label: 'Configure Placements', icon: LayoutGrid },
      { to: '/setup/launch-settings', label: 'Launch Settings', icon: Settings },
    ],
  },
];

const railIcons = [Rocket, ImageIcon, FolderOpen, BarChart3, Megaphone];

export function Shell({ children }: { children: ReactNode }) {
  const { workspace, account } = useAccount();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full bg-bg text-fg">
      {/* Far-left workspace rail */}
      <aside className="w-14 shrink-0 bg-rail border-r border-line flex flex-col items-center py-3 gap-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white grid place-items-center font-bold text-sm">
          {workspace?.name?.[0]?.toUpperCase() ?? 'E'}
        </div>
        <div className="flex flex-col gap-4 text-muted">
          {railIcons.map((Icon, i) => (
            <button key={i} className={`hover:text-fg transition-colors ${i === 0 ? 'text-fg' : ''}`}>
              <Icon size={18} />
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-4 text-muted">
          <button className="hover:text-fg" title={user?.email}><HelpCircle size={18} /></button>
          <button className="hover:text-fg"><Settings size={18} /></button>
          <button className="hover:text-red-400" title="Sign out" onClick={() => logout()}><LogOut size={18} /></button>
        </div>
      </aside>

      {/* Nav column */}
      <nav className="w-60 shrink-0 bg-side border-r border-line px-3 py-3 overflow-y-auto">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-line bg-surface text-sm font-medium mb-4 hover:bg-hover">
          <span className="w-5 h-5 rounded bg-indigo-600 text-white grid place-items-center text-xs">
            {workspace?.name?.[0]?.toUpperCase() ?? 'E'}
          </span>
          <span className="truncate">{workspace?.name ?? 'Workspace'}</span>
          <ChevronDown size={15} className="ml-auto text-muted" />
        </button>

        <div className="text-[11px] uppercase tracking-wide text-muted px-2 mb-1">Ad Account</div>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-line bg-surface text-sm mb-5 hover:bg-hover">
          <span className="text-[#4c9fff]">∞</span>
          <span className="truncate">{account?.name ?? 'Select account'}</span>
          <ChevronDown size={15} className="ml-auto text-muted" />
        </button>

        {navGroups.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="text-[11px] uppercase tracking-wide text-muted px-2 mb-1.5">{g.label}</div>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm mb-0.5 transition-colors ${
                    isActive ? 'bg-hover font-medium text-fg' : 'text-muted hover:bg-hover hover:text-fg'
                  }`
                }
              >
                <it.icon size={16} />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-bg">{children}</main>
    </div>
  );
}
