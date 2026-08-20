import type { SupabaseClient } from "@supabase/supabase-js";

// Admin Portal Overview module: platform-wide metrics, computed straight
// from the DB every load (no caching, no materialized aggregates -- these
// tables aren't expected to be large enough yet to need that). Every
// query here MUST run against a service-role client passed in by the
// caller -- normal RLS scopes everything (workspaces, subscriptions,
// ai_usage_log, promo_code_redemptions) to the caller's own workspace,
// which would make a "platform-wide" number silently wrong instead of
// erroring, so this file never constructs its own session client.
//
// Grouping/aggregation (by plan, by provider, by day) is done in JS after
// a plain SELECT rather than via SQL GROUP BY -- there's no admin-specific
// RPC/view for this yet, and workspace/subscription/promo row counts are
// nowhere near large enough for that to matter. Revisit with a proper
// aggregate query (or a view) if these tables grow large.

const THROUGHPUT_DAYS = 7;

export type PlanBreakdown = { plan: string; count: number };
export type ProviderBreakdown = { provider: string; count: number };
export type ThroughputPoint = { label: string; count: number };

export type AdminOverviewMetrics = {
  workspaces: { total: number; byPlan: PlanBreakdown[] };
  subscriptions: { activeTotal: number; byProvider: ProviderBreakdown[] };
  users: { total: number };
  aiCredits: { totalUsed: number; averageUsed: number };
  promoCodes: { activeCount: number; totalCount: number; totalRedemptions: number };
  aiThroughput: { points: ThroughputPoint[]; totalLast7Days: number };
};

const PLAN_LABELS: Record<string, string> = { free: "Free", solo: "Solo", team: "Team", scale: "Scale" };
const PROVIDER_LABELS: Record<string, string> = { lemonsqueezy: "Lemon Squeezy", safepay: "Safepay" };

function bucketCount<T extends string>(values: T[], labels: Record<string, string>) {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: labels[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAdminOverviewMetrics(supabase: SupabaseClient): Promise<AdminOverviewMetrics> {
  const throughputCutoff = new Date();
  throughputCutoff.setDate(throughputCutoff.getDate() - (THROUGHPUT_DAYS - 1));
  throughputCutoff.setHours(0, 0, 0, 0);

  const [workspacesRes, subscriptionsRes, usersRes, promoCodesRes, redemptionsRes, throughputRes] = await Promise.all([
    supabase.from("workspaces").select("plan, ai_credits_used"),
    supabase.from("subscriptions").select("provider").eq("status", "active"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("promo_codes").select("is_active"),
    supabase.from("promo_code_redemptions").select("id", { count: "exact", head: true }),
    supabase.from("ai_usage_log").select("created_at").gte("created_at", throughputCutoff.toISOString()),
  ]);

  const workspaceRows = (workspacesRes.data as { plan: string | null; ai_credits_used: number | null }[] | null) ?? [];
  const totalWorkspaces = workspaceRows.length;
  const planBreakdown = bucketCount(
    workspaceRows.map((w) => w.plan ?? "free"),
    PLAN_LABELS
  ).map((b) => ({ plan: b.label, count: b.count }));
  const totalCreditsUsed = workspaceRows.reduce((sum, w) => sum + (w.ai_credits_used ?? 0), 0);

  const subscriptionRows = (subscriptionsRes.data as { provider: string }[] | null) ?? [];
  const providerBreakdown = bucketCount(
    subscriptionRows.map((s) => s.provider),
    PROVIDER_LABELS
  ).map((b) => ({ provider: b.label, count: b.count }));

  const promoCodeRows = (promoCodesRes.data as { is_active: boolean }[] | null) ?? [];

  const throughputRows = (throughputRes.data as { created_at: string }[] | null) ?? [];
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = 0; i < THROUGHPUT_DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (THROUGHPUT_DAYS - 1 - i));
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of throughputRows) {
    const key = row.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const throughputPoints: ThroughputPoint[] = Array.from(buckets.entries()).map(([date, count]) => ({
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
    count,
  }));

  return {
    workspaces: { total: totalWorkspaces, byPlan: planBreakdown },
    subscriptions: { activeTotal: subscriptionRows.length, byProvider: providerBreakdown },
    users: { total: usersRes.count ?? 0 },
    aiCredits: {
      totalUsed: totalCreditsUsed,
      averageUsed: totalWorkspaces > 0 ? Math.round(totalCreditsUsed / totalWorkspaces) : 0,
    },
    promoCodes: {
      activeCount: promoCodeRows.filter((c) => c.is_active).length,
      totalCount: promoCodeRows.length,
      totalRedemptions: redemptionsRes.count ?? 0,
    },
    aiThroughput: {
      points: throughputPoints,
      totalLast7Days: throughputRows.length,
    },
  };
}
