import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const navGroups = [
  {
    label: 'Launch',
    items: [
      { to: '/launch', label: 'Launch', icon: '🚀' },
      { to: '/partnership', label: 'Partnership Ads', icon: '🤝' },
      { to: '/creatives', label: 'Creatives', icon: '🖼️' },
      { to: '/launched', label: 'Launched Ads', icon: '📈' },
      { to: '/drafts', label: 'Drafts', icon: '📄' },
    ],
  },
  {
    label: 'Ad Copy',
    items: [
      { to: '/ad-copy/default', label: 'Default Ad Copy', icon: '📝' },
      { to: '/ad-copy/templates', label: 'Ad Copy Templates', icon: '🗂️' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { to: '/setup/enhancements', label: 'Creative Enhancements', icon: '✨' },
      { to: '/setup/placements', label: 'Configure Placements', icon: '🎯' },
      { to: '/setup/launch-settings', label: 'Launch Settings', icon: '⚙️' },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      {/* Far-left workspace rail */}
      <aside className="w-14 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white grid place-items-center font-bold">E</div>
        <div className="flex flex-col gap-3 text-slate-400 text-lg">
          <span>🖼️</span><span>📁</span><span className="text-slate-900">🚀</span><span>📊</span><span>🧩</span>
        </div>
      </aside>

      {/* Nav column */}
      <nav className="w-60 shrink-0 bg-sidebar border-r border-slate-200 px-3 py-3 overflow-y-auto">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 bg-white text-sm font-medium mb-4">
          <span className="w-5 h-5 rounded bg-indigo-700 text-white grid place-items-center text-xs">E</span>
          Ecubate
          <span className="ml-auto text-slate-400">▾</span>
        </button>

        <div className="text-[11px] uppercase tracking-wide text-slate-400 px-2 mb-1">Ad Account</div>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 bg-white text-sm mb-4">
          <span className="text-blue-600">∞</span> Walther Apparel
          <span className="ml-auto text-slate-400">▾</span>
        </button>

        {navGroups.map((g) => (
          <div key={g.label} className="mb-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 px-2 mb-1">{g.label}</div>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm mb-0.5 ${
                    isActive ? 'bg-slate-200/70 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <span className="text-base">{it.icon}</span>
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
