const KPIS = [
  { label: "Revenue", value: "$48.2k", color: "bg-blue-500/70" },
  { label: "Deals", value: "132", color: "bg-emerald-500/70" },
  { label: "Projects", value: "24", color: "bg-purple-500/70" },
  { label: "Invoices", value: "89", color: "bg-amber-500/70" },
];

const CHART_BARS = [35, 55, 40, 70, 50, 85, 60, 75];

// High-fidelity CSS-built dashboard preview for the hero -- no real product
// screenshot is checked into public/ yet. Swap this for an edge-to-edge
// <img src="/dashboard-preview.png" /> once one exists; everything else
// (glow, layered card behind it) can stay.
export function DashboardMockup() {
  return (
    <div className="relative mx-auto mt-24 max-w-5xl" aria-hidden="true">
      <div className="absolute inset-x-6 -top-4 -z-10 h-full rotate-2 rounded-2xl border border-gray-100 bg-gray-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/60" />

      <div className="relative -rotate-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl transition-transform duration-500 hover:rotate-0 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-neutral-800">
          <span className="h-3 w-3 rounded-full bg-red-400/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <span className="h-3 w-3 rounded-full bg-green-400/70" />
          <span className="ml-4 h-5 w-full max-w-xs rounded-md bg-gray-100 dark:bg-neutral-800" />
        </div>

        <div className="grid grid-cols-12 gap-4 p-5">
          <div className="col-span-2 hidden space-y-2.5 sm:block">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full ${
                  i === 1
                    ? "w-full bg-blue-500/70"
                    : "w-4/5 bg-gray-100 dark:bg-neutral-800"
                }`}
              />
            ))}
          </div>

          <div className="col-span-12 space-y-4 sm:col-span-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {KPIS.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="h-2 w-12 rounded bg-gray-300 dark:bg-neutral-700" />
                  <div className={`mt-2 h-4 w-16 rounded ${kpi.color}`} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex h-32 items-end gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-900 sm:col-span-2">
                {CHART_BARS.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-blue-500/70" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="h-2 w-3/4 rounded bg-gray-300 dark:bg-neutral-700" />
                <div className="h-2 w-1/2 rounded bg-gray-200 dark:bg-neutral-800" />
                <div className="h-2 w-2/3 rounded bg-gray-300 dark:bg-neutral-700" />
                <div className="h-2 w-1/3 rounded bg-gray-200 dark:bg-neutral-800" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -inset-4 -z-20 rounded-2xl bg-gradient-to-r from-blue-200 via-blue-100 to-transparent opacity-20 blur-2xl dark:from-blue-600/20 dark:via-purple-500/20 dark:to-blue-500/20 dark:opacity-30" />
    </div>
  );
}
