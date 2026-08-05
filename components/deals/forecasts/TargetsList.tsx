"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { deleteSalesTarget } from "@/lib/actions/salesTargets";
import type { SalesTarget } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function TargetsList({
  targets,
  canManage,
  onDeleted,
}: {
  targets: SalesTarget[];
  canManage: boolean;
  onDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSalesTarget(id);
      if (!result.error) onDeleted(id);
    });
  }

  if (targets.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">No targets set yet.</p>
    );
  }

  const sorted = [...targets].sort((a, b) => b.period_start.localeCompare(a.period_start));

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Assigned to</th>
            <th className="px-4 py-3">Pipeline</th>
            <th className="px-4 py-3">Goal</th>
            {canManage && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((t) => (
            <tr key={t.id} className="text-slate-700 dark:text-slate-300">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{t.period_label}</td>
              <td className="px-4 py-3">{t.assignee?.full_name ?? "Entire team"}</td>
              <td className="px-4 py-3">{t.pipelines?.name ?? "All pipelines"}</td>
              <td className="px-4 py-3">{currency.format(t.revenue_goal)}</td>
              {canManage && (
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <RowActionsMenu
                      ariaLabel="Target actions"
                      actions={[
                        {
                          label: isPending ? "Deleting…" : "Delete",
                          onClick: () => handleDelete(t.id),
                          icon: Trash2,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
