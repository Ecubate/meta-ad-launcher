export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-slate-500 text-sm">This section is scaffolded and will be built out next.</p>
    </div>
  );
}
