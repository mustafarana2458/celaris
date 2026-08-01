export function ComingSoonTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-800">
      <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-hover dark:bg-accent/15 dark:text-accent">
        Coming soon
      </span>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}
