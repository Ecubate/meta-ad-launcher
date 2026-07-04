import { ReactNode } from 'react';

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-[#39424f]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label && (
        <span>
          <span className="text-sm font-medium text-fg">{label}</span>
          {hint && <span className="block text-xs text-muted">{hint}</span>}
        </span>
      )}
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-fg mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-md bg-input border border-line text-sm text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 ${props.className ?? ''}`}
    />
  );
}

export function SaveButton({ onClick, saving, children = 'Save Changes' }: { onClick: () => void; saving?: boolean; children?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-line bg-surface text-sm font-medium text-fg hover:bg-hover disabled:opacity-50"
    >
      {saving ? 'Saving…' : children}
    </button>
  );
}

export function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[280px_1fr] gap-8 py-8 border-b border-line">
      <div>
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {desc && <p className="text-sm text-muted mt-1">{desc}</p>}
      </div>
      <div className="max-w-3xl">{children}</div>
    </section>
  );
}
