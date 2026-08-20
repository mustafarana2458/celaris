export function BreakdownTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No data yet.</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{row.label}</td>
                <td className="py-2 pr-4 text-right text-slate-500 dark:text-slate-400">{row.count}</td>
                <td className="w-24 py-2 text-right text-xs text-slate-400 dark:text-slate-500">
                  {total > 0 ? `${Math.round((row.count / total) * 100)}%` : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
