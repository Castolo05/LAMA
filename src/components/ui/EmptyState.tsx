export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-lama-line bg-white px-6 py-12 text-center">
      <p className="font-display font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-lama-steel">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
