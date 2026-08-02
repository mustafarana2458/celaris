export function ChartCard({
  title,
  subtitle,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  subtitle?: string;
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-4 h-64">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500 dark:bg-slate-700/40 dark:text-slate-400">
            {emptyMessage ?? "No data yet"}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
