import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSessionPage } from "@/lib/adminAuth";
import { getAuthEmailMap } from "@/lib/adminUsers";
import { MetricCard } from "@/components/admin/overview/MetricCard";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

// Admin Financials module: read-only billing/subscription health across
// every workspace. Pure Server Component, same zero-client-JS pattern as
// Audit Logs and Workspaces -- filtering is a plain GET form, no
// mutations exist on this page at all.
//
// What actually backs this module (investigated before building, see the
// phase report): the `subscriptions` table (lib/subscriptionSync.ts /
// lib/safepaySubscriptionSync.ts write it from LS/Safepay webhooks) is
// the only real billing data in this DB. There is NO payments,
// invoices, or webhook_events/failures table anywhere in this codebase
// (grepped for all three) -- so "payment failure alerts" and "invoice
// history" from the boss's spec are NOT buildable from real data yet.
// Rather than fabricate either, this page says so explicitly instead of
// showing empty/fake sections.
//
// Status vocabulary (active/on_trial/cancelled/past_due/unpaid/paused/
// expired/incomplete) and its badge styling are copied verbatim from
// app/dashboard/settings/tabs/BillingTab.tsx's STATUS_STYLES/STATUS_LABELS
// -- both providers deliberately write into this same shared vocabulary
// (see safepaySubscriptionSync.ts's handleEnded comment), so reusing it
// here keeps one visual language for subscription status across the
// whole app instead of inventing a second one for the admin side.

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  on_trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  cancelled: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  past_due: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  paused: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  incomplete: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_trial: "Trial",
  cancelled: "Cancelled",
  past_due: "Past Due",
  unpaid: "Unpaid",
  paused: "Paused",
  incomplete: "Incomplete",
  expired: "Expired",
};

const PLAN_LABELS: Record<string, string> = { solo: "Solo", team: "Team", scale: "Scale" };
const PROVIDER_LABELS: Record<string, string> = { lemonsqueezy: "Lemon Squeezy", safepay: "Safepay" };

// Every status that indicates the subscription isn't cleanly active/
// trialing right now -- per the boss's explicit list. Cancelled/expired
// are terminal states rather than active payment problems, but the badge
// color (muted grey/amber vs. red for past_due/unpaid) already carries
// that distinction visually; this count intentionally follows the boss's
// literal list rather than narrowing it further.
const NEEDS_ATTENTION_STATUSES = new Set(["unpaid", "past_due", "incomplete", "cancelled", "expired"]);

const TABLE_ROW_LIMIT = 200;

type SubscriptionMetricRow = { provider: string | null; status: string; updated_at: string };
type SubscriptionTableRow = {
  id: string;
  workspace_id: string;
  provider: string | null;
  plan_tier: string;
  status: string;
  current_period_end: string | null;
  updated_at: string;
};

function normalizeProvider(provider: string | null): "lemonsqueezy" | "safepay" {
  // Rows written before the Safepay migration have no provider value at
  // all -- treated as Lemon Squeezy, same fallback BillingTab already
  // uses (`subscription.provider === "safepay" ? "Safepay" : "Lemon Squeezy"`).
  return provider === "safepay" ? "safepay" : "lemonsqueezy";
}

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Honest, literal "how long ago" -- not a healthy/unhealthy verdict, just
// the knowable fact (a provider's most recent webhook-driven write),
// exactly as the task asked for.
function relativeFromNow(iso: string | null): string {
  if (!iso) return "no activity yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default async function AdminFinancialsPage({
  searchParams,
}: {
  searchParams: { provider?: string; status?: string };
}) {
  await requireAdminSessionPage();

  const providerFilter = searchParams.provider?.trim() ?? "";
  const statusFilter = searchParams.status?.trim() ?? "";

  const supabase = createServiceClient();

  let tableQuery = supabase
    .from("subscriptions")
    .select("id, workspace_id, provider, plan_tier, status, current_period_end, updated_at")
    .order("updated_at", { ascending: false })
    .limit(TABLE_ROW_LIMIT);
  if (providerFilter) tableQuery = tableQuery.eq("provider", providerFilter);
  if (statusFilter) tableQuery = tableQuery.eq("status", statusFilter);

  // Metrics are computed over EVERY row (unfiltered, uncapped) so the
  // summary cards always reflect true platform-wide totals regardless of
  // what the table below is currently filtered to.
  const [metricsRes, tableRes, workspacesRes, emailMap] = await Promise.all([
    supabase.from("subscriptions").select("provider, status, updated_at"),
    tableQuery,
    supabase.from("workspaces").select("id, name, owner_id"),
    getAuthEmailMap(supabase),
  ]);

  const metricRows = (metricsRes.data as SubscriptionMetricRow[] | null) ?? [];
  const tableRows = (tableRes.data as SubscriptionTableRow[] | null) ?? [];

  const workspaceById = new Map<string, { name: string; owner_id: string | null }>();
  for (const w of (workspacesRes.data as { id: string; name: string; owner_id: string | null }[] | null) ?? []) {
    workspaceById.set(w.id, w);
  }

  const activeTotal = metricRows.filter((r) => r.status === "active").length;
  const needsAttentionTotal = metricRows.filter((r) => NEEDS_ATTENTION_STATUSES.has(r.status)).length;

  const providerStats = { lemonsqueezy: { active: 0, lastSynced: null as string | null }, safepay: { active: 0, lastSynced: null as string | null } };
  for (const row of metricRows) {
    const provider = normalizeProvider(row.provider);
    if (row.status === "active") providerStats[provider].active += 1;
    if (!providerStats[provider].lastSynced || row.updated_at > providerStats[provider].lastSynced!) {
      providerStats[provider].lastSynced = row.updated_at;
    }
  }

  const hasFilter = Boolean(providerFilter || statusFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Financials</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Subscription and billing health across every workspace, from Lemon Squeezy and Safepay webhook sync.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active subscriptions" value={activeTotal.toLocaleString()} />
        <MetricCard label="Needs attention" value={needsAttentionTotal.toLocaleString()} hint="unpaid, past due, incomplete, cancelled, or expired" />
        <MetricCard label="Active on Lemon Squeezy" value={providerStats.lemonsqueezy.active.toLocaleString()} />
        <MetricCard label="Active on Safepay" value={providerStats.safepay.active.toLocaleString()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["lemonsqueezy", "safepay"] as const).map((provider) => (
          <div key={provider} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{PROVIDER_LABELS[provider]} sync</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Last webhook-driven update: {formatDateTime(providerStats[provider].lastSynced)} ({relativeFromNow(providerStats[provider].lastSynced)})
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              This is the most recent write from a {PROVIDER_LABELS[provider]} webhook, not a live health check --
              there&apos;s no separate signal in this DB for whether the webhook endpoint itself is currently reachable.
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-300">Not available yet:</strong> payment failure alerts require a
        payments/webhook-events table that doesn&apos;t exist in this DB yet (only the current subscription state is
        stored, not a history of individual payment attempts). Invoice history isn&apos;t stored locally either --
        it lives in the Lemon Squeezy and Safepay dashboards directly. Neither is faked here.
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <Select label="Provider" name="provider" defaultValue={providerFilter}>
          <option value="">All providers</option>
          <option value="lemonsqueezy">Lemon Squeezy</option>
          <option value="safepay">Safepay</option>
        </Select>
        <Select label="Status" name="status" defaultValue={statusFilter}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit">Filter</Button>
        {hasFilter && (
          <a
            href="/admin/financials"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Clear
          </a>
        )}
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {tableRows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            {hasFilter ? "No subscriptions match this filter." : "No subscriptions yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="px-6 py-3 font-medium">Workspace</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Period end</th>
                  <th className="px-6 py-3 font-medium">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const workspace = workspaceById.get(row.workspace_id);
                  const provider = normalizeProvider(row.provider);
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{workspace?.name ?? "--"}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {(workspace?.owner_id && emailMap.get(workspace.owner_id)) || "--"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{PROVIDER_LABELS[provider]}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{PLAN_LABELS[row.plan_tier] ?? row.plan_tier}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(row.current_period_end)}</td>
                      <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(row.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
