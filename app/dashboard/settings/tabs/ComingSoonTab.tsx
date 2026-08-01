export function ComingSoonTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        Coming soon
      </span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
