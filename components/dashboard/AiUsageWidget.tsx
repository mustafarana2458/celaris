"use client";

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { getRemainingCredits } from "@/lib/aiCreditsCore";
import { getAiUsageChart, type AiUsageChartPoint } from "@/lib/actions/aiUsage";
import { setAiUsageChartView } from "@/lib/actions/userPreferences";
import type { AiUsageChartView } from "@/lib/types";
import { AiUsageChart } from "./charts/AiUsageChart";

const AI_USAGE_HREF = "/dashboard/settings?tab=ai-usage";

// Sidebar widget: balance bar + a tiny 7-day/6-month chart, click-through to
// the settings AI Usage tab. Not a <Link> because the daily/monthly toggle
// buttons need to sit inside it without nesting <button> inside <a> --
// keyboard/click navigation on the outer card is done manually instead.
export function AiUsageWidget({ initialChartView }: { initialChartView: AiUsageChartView }) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [view, setView] = useState<AiUsageChartView>(initialChartView);
  const [points, setPoints] = useState<AiUsageChartPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAiUsageChart(view).then((result) => {
      if (!cancelled && "points" in result) setPoints(result.points);
    });
    return () => {
      cancelled = true;
    };
  }, [view]);

  if (!workspace) return null;

  const credits = getRemainingCredits(workspace);
  const pct = credits.limit > 0 ? Math.min(100, (credits.used / credits.limit) * 100) : 0;
  const barColorClass = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-accent";

  function navigateToUsage() {
    router.push(AI_USAGE_HREF);
  }

  function handleCardKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigateToUsage();
    }
  }

  function handleViewChange(next: AiUsageChartView, e: MouseEvent) {
    e.stopPropagation();
    setPoints(null);
    setView(next);
    void setAiUsageChartView(next);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={navigateToUsage}
      onKeyDown={handleCardKeyDown}
      aria-label="AI Usage -- view details in Settings"
      className="mb-3 flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Usage</span>
        <div className="flex gap-0.5 text-[10px] font-medium">
          <button
            type="button"
            onClick={(e) => handleViewChange("daily", e)}
            className={`rounded px-1.5 py-0.5 transition-colors ${
              view === "daily"
                ? "bg-accent/15 text-accent-hover dark:text-accent"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={(e) => handleViewChange("monthly", e)}
            className={`rounded px-1.5 py-0.5 transition-colors ${
              view === "monthly"
                ? "bg-accent/15 text-accent-hover dark:text-accent"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="h-10">
        {points ? (
          <AiUsageChart data={points} compact />
        ) : (
          <div className="h-full animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
        )}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all ${barColorClass}`} style={{ width: `${pct}%` }} />
      </div>

      <span className="text-[11px] text-slate-400 dark:text-slate-500">
        {credits.used} / {credits.limit} credits used
      </span>
    </div>
  );
}
