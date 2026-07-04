export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-fg mb-2">{title}</h1>
      <p className="text-muted text-sm">This section is scaffolded and will be built out next.</p>
    </div>
  );
}
