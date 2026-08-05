import type { PeriodBucket } from "@/lib/forecastPeriods";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function GoalProgressBar({
  bucket,
  targetRevenue,
  wonRevenue,
  weightedForecast,
}: {
  bucket: PeriodBucket;
  targetRevenue: number;
  wonRevenue: number;
  weightedForecast: number;
}) {
  if (targetRevenue <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          No target set for {bucket.label} yet
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set a revenue goal to track progress against this period.
        </p>
      </div>
    );
  }

  const wonPct = Math.min(100, (wonRevenue / targetRevenue) * 100);
  const coveredPct = Math.min(100, ((wonRevenue + weightedForecast) / targetRevenue) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {wonPct.toFixed(0)}% of {bucket.label} target reached
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {currency.format(wonRevenue)} of {currency.format(targetRevenue)}
        </p>
      </div>

      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-accent/10">
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent/35" style={{ width: `${coveredPct}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${wonPct}%` }} />
      </div>

      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Solid = won revenue · light = won + weighted pipeline coverage
      </p>
    </div>
  );
}
