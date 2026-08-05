"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createSalesTarget } from "@/lib/actions/salesTargets";
import { monthBucket, quarterBucket, type ForecastPeriodType } from "@/lib/forecastPeriods";
import type { Pipeline, SalesTarget, WorkspaceTeamMember } from "@/lib/types";

const selectClass =
  "rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const QUARTERS = [1, 2, 3, 4];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SetTargetModal({
  open,
  onClose,
  members,
  pipelines,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  members: WorkspaceTeamMember[];
  pipelines: Pipeline[];
  onCreated: (target: SalesTarget) => void;
}) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<ForecastPeriodType>("quarter");
  const [year, setYear] = useState(now.getFullYear());
  const [periodValue, setPeriodValue] = useState(
    periodType === "quarter" ? Math.floor(now.getMonth() / 3) + 1 : now.getMonth() + 1
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bucket = useMemo(
    () => (periodType === "quarter" ? quarterBucket(year, periodValue) : monthBucket(year, periodValue)),
    [periodType, year, periodValue]
  );

  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);

  function handleTypeChange(type: ForecastPeriodType) {
    setPeriodType(type);
    setPeriodValue(type === "quarter" ? Math.floor(now.getMonth() / 3) + 1 : now.getMonth() + 1);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("period_label", bucket.label);
    formData.set("period_start", bucket.start);
    formData.set("period_end", bucket.end);

    startTransition(async () => {
      try {
        const result = await createSalesTarget(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.target) onCreated(result.target);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Set target">
      <form action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Target period</span>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={periodType}
              onChange={(e) => handleTypeChange(e.target.value as ForecastPeriodType)}
              className={selectClass}
            >
              <option value="quarter">Quarter</option>
              <option value="month">Month</option>
            </select>
            <select
              value={periodValue}
              onChange={(e) => setPeriodValue(Number(e.target.value))}
              className={selectClass}
            >
              {periodType === "quarter"
                ? QUARTERS.map((q) => (
                    <option key={q} value={q}>
                      Q{q}
                    </option>
                  ))
                : MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {bucket.label} · {bucket.start} to {bucket.end}
          </p>
        </div>

        <Input label="Revenue goal ($)" name="revenue_goal" type="number" step="0.01" min="0" required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="assigned_to" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Assigned to
          </label>
          <select id="assigned_to" name="assigned_to" defaultValue="" className={selectClass}>
            <option value="">Entire team</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name ?? m.email ?? "Unnamed"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="pipeline_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Pipeline filter <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          </label>
          <select id="pipeline_id" name="pipeline_id" defaultValue="" className={selectClass}>
            <option value="">All pipelines</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Notes / sales strategy <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Set target
          </Button>
        </div>
      </form>
    </Modal>
  );
}
