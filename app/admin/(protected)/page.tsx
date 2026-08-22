import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSessionPage } from "@/lib/adminAuth";
import { getAdminOverviewMetrics } from "@/lib/adminAnalytics";
import { MetricCard } from "@/components/admin/overview/MetricCard";
import { BreakdownTable } from "@/components/admin/overview/BreakdownTable";
import { AiThroughputChart } from "@/components/admin/overview/AiThroughputChart";

// Admin Portal Overview module: read-only, platform-wide metrics. No
// mutations anywhere on this page. requireAdminSessionPage() re-verifies
// the admin session explicitly (app/admin/(protected)/layout.tsx already
// covers this page's render, but a module reading across every
// workspace via the service-role client is worth keeping that
// assumption visible rather than implicit -- see the comment on
// requireAdminSessionPage in lib/adminAuth.ts). All metrics come from
// getAdminOverviewMetrics(), which is handed the service-role client
// here, never the session client -- normal RLS would scope every one of
// these tables to the caller's own workspace, silently turning a
// "platform-wide" number into "just mine".
export default async function AdminOverviewPage() {
  await requireAdminSessionPage();

  const supabase = createServiceClient();
  const metrics = await getAdminOverviewMetrics(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform-wide metrics across every workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Workspaces" value={metrics.workspaces.total.toLocaleString()} />
        <MetricCard label="Active subscriptions" value={metrics.subscriptions.activeTotal.toLocaleString()} />
        <MetricCard label="Registered users" value={metrics.users.total.toLocaleString()} />
        <MetricCard
          label="AI credits used"
          value={metrics.aiCredits.totalUsed.toLocaleString()}
          hint={`${metrics.aiCredits.averageUsed.toLocaleString()} avg / workspace`}
        />
        <MetricCard
          label="Active promo codes"
          value={metrics.promoCodes.activeCount.toLocaleString()}
          hint={`${metrics.promoCodes.totalCount.toLocaleString()} total`}
        />
        <MetricCard label="Promo redemptions" value={metrics.promoCodes.totalRedemptions.toLocaleString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="Workspaces by plan"
          rows={metrics.workspaces.byPlan.map((b) => ({ label: b.plan, count: b.count }))}
          total={metrics.workspaces.total}
        />
        <BreakdownTable
          title="Active subscriptions by provider"
          rows={metrics.subscriptions.byProvider.map((b) => ({ label: b.provider, count: b.count }))}
          total={metrics.subscriptions.activeTotal}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI request throughput</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {metrics.aiThroughput.totalLast7Days.toLocaleString()} requests, last 7 days
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Request counts from ai_usage_log across every workspace -- a throughput count, not full request-level
          telemetry (no latency/error/model-routing data exists yet to chart beyond this).
        </p>
        <div className="mt-4 h-48">
          <AiThroughputChart data={metrics.aiThroughput.points} />
        </div>
      </div>
    </div>
  );
}
