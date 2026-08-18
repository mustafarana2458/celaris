"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AI_ACTION_LABELS, CREDIT_COSTS, getRemainingCredits, type AiActionType } from "@/lib/aiCreditsCore";
import {
  getAiUsageChart,
  getAiUsageLogPage,
  type AiUsageChartPoint,
  type AiUsageLogRow,
} from "@/lib/actions/aiUsage";
import { setAiUsageChartView, setShowAiUsageWidget } from "@/lib/actions/userPreferences";
import { AiUsageChart } from "@/components/dashboard/charts/AiUsageChart";
import { ClearAiUsageLogDialog } from "./ClearAiUsageLogDialog";
import type { CurrentWorkspace } from "@/lib/workspace";
import type { AiUsageChartView } from "@/lib/types";

const toggleClass =
  "h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-600";

// The boss's literal reference table -- some rows deliberately fold two
// AiActionTypes into one line (e.g. ai_insights + summarize_deal both cost 2
// and both read as "Insight / Summarize Deal / Pipeline Analysis"). Costs
// are pulled from CREDIT_COSTS (never hardcoded) so this can't drift from
// what's actually enforced. create_deal and create_task (both 2 credits,
// enforced since Phase 2) have no row in the boss's doc -- not added here
// since the doc asked for its EXACT structure; flagged separately instead.
const CREDIT_REFERENCE_ROWS: { label: string; actionTypes: AiActionType[]; pending?: boolean }[] = [
  { label: "General Chat / Quick Question / Search", actionTypes: ["chat"] },
  { label: "Insight / Summarize Deal / Pipeline Analysis", actionTypes: ["ai_insights", "summarize_deal"] },
  { label: "Create New Contact or Company via Chat", actionTypes: ["create_contact", "create_company"] },
  { label: "Generate Project Scope / Break Down into Tasks", actionTypes: ["create_project", "task_breakdown"] },
  { label: "Draft Client Email / Outreach Message", actionTypes: ["draft_email"] },
  { label: "Create & Format Full Invoice with Line Items", actionTypes: ["create_invoice"] },
  { label: "Parse Document / Extract Contact Info from Image/File", actionTypes: ["parse_document"], pending: true },
  { label: "Deep Financial & Revenue Forecasting Report", actionTypes: ["forecast_report"], pending: true },
];

// Must match LOG_PAGE_SIZE in lib/actions/aiUsage.ts (not exported since
// that's a "use server" file, which may only export async functions).
const LOG_PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AiUsageTab({
  workspace,
  initialShowWidget,
  initialChartView,
}: {
  workspace: CurrentWorkspace | null;
  initialShowWidget: boolean;
  initialChartView: AiUsageChartView;
}) {
  const router = useRouter();

  const [showWidget, setShowWidget] = useState(initialShowWidget);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [chartView, setChartView] = useState<AiUsageChartView>(initialChartView);
  const [chartPoints, setChartPoints] = useState<AiUsageChartPoint[] | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const [logRows, setLogRows] = useState<AiUsageLogRow[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logTotal, setLogTotal] = useState(0);
  const [logError, setLogError] = useState<string | null>(null);
  const [logLoading, startLogTransition] = useTransition();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  // Bumped after "Clear log" succeeds to force both the chart and the log
  // page effects below to re-fetch (they're both derived from the same
  // ai_usage_log table, so clearing it empties both).
  const [refreshKey, setRefreshKey] = useState(0);

  const [costTableOpen, setCostTableOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChartPoints(null);
    getAiUsageChart(chartView).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setChartError(result.error);
        return;
      }
      setChartError(null);
      setChartPoints(result.points);
    });
    return () => {
      cancelled = true;
    };
  }, [chartView, refreshKey]);

  useEffect(() => {
    startLogTransition(async () => {
      const result = await getAiUsageLogPage(logPage);
      if ("error" in result) {
        setLogError(result.error);
        return;
      }
      setLogError(null);
      setLogRows(result.rows);
      setLogTotal(result.total);
    });
  }, [logPage, refreshKey]);

  const logTotalPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));

  function handleLogCleared() {
    setClearDialogOpen(false);
    setLogPage(0);
    setRefreshKey((k) => k + 1);
  }

  async function handleToggleWidget(checked: boolean) {
    setShowWidget(checked);
    setToggleError(null);
    const result = await setShowAiUsageWidget(checked);
    if (result.error) {
      setShowWidget(!checked);
      setToggleError(result.error);
      return;
    }
    // Sidebar reads this preference server-side via app/dashboard/layout.tsx
    // -- refresh so it hides/shows immediately instead of on next navigation.
    router.refresh();
  }

  function handleChartViewChange(view: AiUsageChartView) {
    setChartView(view);
    void setAiUsageChartView(view);
  }

  const credits = workspace ? getRemainingCredits(workspace) : null;
  const canClearLog = workspace?.role === "owner" || workspace?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Usage</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track how your workspace&apos;s AI credits are being spent, and where.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Show AI Usage in Sidebar
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Displays a balance bar and mini usage chart in the sidebar for quick reference.
            </span>
          </span>
          <input type="checkbox" checked={showWidget} onChange={(e) => handleToggleWidget(e.target.checked)} className={toggleClass} />
        </label>
        {toggleError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{toggleError}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Usage over time</h3>
            {credits && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {credits.used} / {credits.limit} credits used this month
              </p>
            )}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-700">
            <button
              type="button"
              onClick={() => handleChartViewChange("daily")}
              className={`rounded-md px-3 py-1 transition-colors ${
                chartView === "daily"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => handleChartViewChange("monthly")}
              className={`rounded-md px-3 py-1 transition-colors ${
                chartView === "monthly"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="mt-4 h-56">
          {chartError ? (
            <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm text-red-600 dark:bg-slate-700/40 dark:text-red-400">
              {chartError}
            </div>
          ) : chartPoints ? (
            <AiUsageChart data={chartPoints} />
          ) : (
            <div className="h-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-700/40" />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Detailed usage log</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Every AI action across your workspace and its credit cost.
            </p>
          </div>
          {canClearLog && logRows.length > 0 && (
            <button
              type="button"
              onClick={() => setClearDialogOpen(true)}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-slate-600 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Clear logs
            </button>
          )}
        </div>

        {logError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{logError}</p>}

        {!logError && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Date &amp; time</th>
                  <th className="pb-2 pr-4 font-medium">Action performed</th>
                  <th className="pb-2 font-medium text-right">Credits deducted</th>
                </tr>
              </thead>
              <tbody>
                {logRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {dateFormatter.format(new Date(row.createdAt))}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                      {AI_ACTION_LABELS[row.actionType as AiActionType] ?? row.actionType}
                    </td>
                    <td className="py-2.5 text-right font-medium text-red-600 dark:text-red-400">-{row.cost} Credits</td>
                  </tr>
                ))}
                {logRows.length === 0 && !logLoading && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                      No AI activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {logTotal > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setLogPage((p) => Math.max(0, p - 1))}
              disabled={logLoading || logPage === 0}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {logPage + 1} of {logTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setLogPage((p) => Math.min(logTotalPages - 1, p + 1))}
              disabled={logLoading || logPage >= logTotalPages - 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ClearAiUsageLogDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onCleared={handleLogCleared}
      />

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setCostTableOpen((prev) => !prev)}
          aria-expanded={costTableOpen}
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Learn how AI credits work</span>
          <ChevronDownIcon open={costTableOpen} />
        </button>

        <div
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
            costTableOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_REFERENCE_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                      <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                        {row.label}
                        {row.pending && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            Coming soon
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                        {CREDIT_COSTS[row.actionTypes[0]]} Credit{CREDIT_COSTS[row.actionTypes[0]] === 1 ? "" : "s"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
