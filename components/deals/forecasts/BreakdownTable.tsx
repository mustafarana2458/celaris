import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { dateInBucket, bucketsOverlap, type PeriodBucket } from "@/lib/forecastPeriods";
import type { Deal, SalesTarget, WorkspaceTeamMember } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type MemberRow = {
  member: WorkspaceTeamMember;
  target: number | null;
  pipelineValue: number;
  wonThisPeriod: number;
  progress: number | null;
};

export function BreakdownTable({
  members,
  deals,
  targets,
  bucket,
}: {
  members: WorkspaceTeamMember[];
  deals: Deal[];
  targets: SalesTarget[];
  bucket: PeriodBucket;
}) {
  const rows: MemberRow[] = members.map((member) => {
    const memberTargets = targets.filter(
      (t) => t.assigned_to === member.user_id && bucketsOverlap(t.period_start, t.period_end, bucket.start, bucket.end)
    );
    const target = memberTargets.length > 0 ? memberTargets.reduce((sum, t) => sum + t.revenue_goal, 0) : null;

    const ownedDeals = deals.filter((d) => d.owner_id === member.user_id);
    const pipelineValue = ownedDeals
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((sum, d) => sum + (d.value ?? 0), 0);
    const wonThisPeriod = ownedDeals
      .filter((d) => d.stage === "won" && dateInBucket(d.expected_close, bucket))
      .reduce((sum, d) => sum + (d.value ?? 0), 0);

    const progress = target && target > 0 ? Math.min(100, (wonThisPeriod / target) * 100) : null;

    return { member, target, pipelineValue, wonThisPeriod, progress };
  });

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No team members yet</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Invite teammates from the Team page to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Team member</th>
            <th className="px-4 py-3">{bucket.label} target</th>
            <th className="px-4 py-3">Active pipeline</th>
            <th className="px-4 py-3">Won this period</th>
            <th className="px-4 py-3">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map(({ member, target, pipelineValue, wonThisPeriod, progress }) => {
            const name = member.full_name ?? member.email ?? "Unnamed";
            return (
              <tr key={member.user_id} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${tagColor(name).dot}`}
                    >
                      {getInitials(name)}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{target != null ? currency.format(target) : "—"}</td>
                <td className="px-4 py-3">{currency.format(pipelineValue)}</td>
                <td className="px-4 py-3">{currency.format(wonThisPeriod)}</td>
                <td className="px-4 py-3">
                  {progress != null ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-accent/10">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{progress.toFixed(0)}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">No target set</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
