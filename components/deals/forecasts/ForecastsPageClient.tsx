"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DealsTabs } from "@/components/deals/DealsTabs";
import { RevenueProjectionChart } from "./RevenueProjectionChart";
import { GoalProgressBar } from "./GoalProgressBar";
import { BreakdownTable } from "./BreakdownTable";
import { SetTargetModal } from "./SetTargetModal";
import { TargetsList } from "./TargetsList";
import { computeBucketMetrics } from "./forecastMath";
import { currentBucket, trailingBuckets, type ForecastPeriodType } from "@/lib/forecastPeriods";
import type { Deal, Pipeline, SalesTarget, WorkspaceTeamMember } from "@/lib/types";

export function ForecastsPageClient({
  deals,
  initialTargets,
  pipelines,
  members,
  currentRole,
  loadError,
}: {
  deals: Deal[];
  initialTargets: SalesTarget[];
  pipelines: Pipeline[];
  members: WorkspaceTeamMember[];
  currentRole: string;
  loadError?: string | null;
}) {
  const [targets, setTargets] = useState(initialTargets);
  const [periodType, setPeriodType] = useState<ForecastPeriodType>("quarter");
  const [modalOpen, setModalOpen] = useState(false);

  const canManage = currentRole === "owner" || currentRole === "admin";
  const current = useMemo(() => currentBucket(periodType), [periodType]);

  const chartData = useMemo(() => {
    const count = periodType === "quarter" ? 5 : 6;
    return trailingBuckets(periodType, count).map((bucket) => computeBucketMetrics(bucket, deals, targets));
  }, [periodType, deals, targets]);

  const currentMetrics = chartData[chartData.length - 1];

  function handleTargetCreated(target: SalesTarget) {
    setTargets((prev) => [...prev, target]);
  }

  function handleTargetDeleted(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <DealsTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Forecasts</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Revenue projection and team targets, {periodType === "quarter" ? "quarterly" : "monthly"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {(["quarterly", "monthly"] as const).map((label) => {
              const type: ForecastPeriodType = label === "quarterly" ? "quarter" : "month";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPeriodType(type)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    periodType === type
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {canManage && <Button onClick={() => setModalOpen(true)}>+ Set target</Button>}
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t load forecasts: {loadError}
        </div>
      )}

      <GoalProgressBar
        bucket={current}
        targetRevenue={currentMetrics.targetRevenue}
        wonRevenue={currentMetrics.wonRevenue}
        weightedForecast={currentMetrics.weightedForecast}
      />

      <RevenueProjectionChart data={chartData} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Team breakdown — {current.label}
        </h2>
        <BreakdownTable members={members} deals={deals} targets={targets} bucket={current} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Targets</h2>
        <TargetsList targets={targets} canManage={canManage} onDeleted={handleTargetDeleted} />
      </div>

      <SetTargetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        members={members}
        pipelines={pipelines}
        onCreated={handleTargetCreated}
      />
    </div>
  );
}
