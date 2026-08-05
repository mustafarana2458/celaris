import { STAGE_PROBABILITY } from "./stages";
import type { Deal } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function DealForecast({ deals }: { deals: Deal[] }) {
  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const won = deals.filter((d) => d.stage === "won");
  const lost = deals.filter((d) => d.stage === "lost");

  const pipelineValue = open.reduce((sum, d) => sum + (d.value ?? 0), 0);

  const weightedValue = open.reduce((sum, d) => {
    const probability = d.win_probability != null ? d.win_probability / 100 : STAGE_PROBABILITY[d.stage];
    return sum + (d.value ?? 0) * probability;
  }, 0);

  const decided = won.length + lost.length;
  const winRate = decided > 0 ? (won.length / decided) * 100 : null;
  const wonShare = decided > 0 ? (won.length / decided) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">Pipeline forecast</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {currency.format(pipelineValue)}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {open.length} open deal{open.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">Weighted forecast</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {currency.format(weightedValue)}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          By win probability, or stage estimate if unset
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">Win rate</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {winRate != null ? `${winRate.toFixed(0)}%` : "—"}
        </p>
        {decided > 0 ? (
          <>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950/40">
              <div className="bg-accent" style={{ width: `${wonShare}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {won.length} won · {lost.length} lost
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No closed deals yet</p>
        )}
      </div>
    </div>
  );
}
