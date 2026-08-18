"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { AiActionType } from "@/lib/aiCreditsCore";
import type { AiUsageChartView } from "@/lib/types";

type WorkspaceCtx = { ok: true; supabase: SupabaseClient; workspaceId: string } | { ok: false; error: string };
type WorkspaceCtxWithRole =
  | { ok: true; supabase: SupabaseClient; workspaceId: string; role: string }
  | { ok: false; error: string };

async function requireWorkspaceId(): Promise<WorkspaceCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) return { ok: false, error: "No workspace found for this account." };

  return { ok: true, supabase, workspaceId: workspace.id };
}

async function requireWorkspaceIdWithRole(): Promise<WorkspaceCtxWithRole> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) return { ok: false, error: "No workspace found for this account." };

  return { ok: true, supabase, workspaceId: workspace.id, role: workspace.role };
}

export type AiUsageChartPoint = { label: string; credits: number };
export type AiUsageChartResult = { points: AiUsageChartPoint[] } | { error: string };

const DAILY_DAYS = 7;
const MONTHLY_MONTHS = 6;

// Aggregated straight from ai_usage_log -- the whole workspace's usage
// (every member's actions), not just the caller's, since the credit pool
// itself is workspace-level, not per-user. Bounded to the last 7 days /
// 6 months via a `created_at` cutoff on the query itself so this never
// pulls the workspace's entire history -- called once per chart-view toggle
// (mount + daily/monthly switch), not on every render.
export async function getAiUsageChart(view: AiUsageChartView): Promise<AiUsageChartResult> {
  const ctx = await requireWorkspaceId();
  if (!ctx.ok) return { error: ctx.error };

  const now = new Date();
  const cutoff = new Date(now);
  if (view === "daily") {
    cutoff.setDate(cutoff.getDate() - (DAILY_DAYS - 1));
    cutoff.setHours(0, 0, 0, 0);
  } else {
    cutoff.setDate(1);
    cutoff.setMonth(cutoff.getMonth() - (MONTHLY_MONTHS - 1));
    cutoff.setHours(0, 0, 0, 0);
  }

  const { data, error } = await ctx.supabase
    .from("ai_usage_log")
    .select("cost, created_at")
    .eq("workspace_id", ctx.workspaceId)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };

  const rows = (data as { cost: number; created_at: string }[] | null) ?? [];

  if (view === "daily") {
    const buckets = new Map<string, number>();
    for (let i = 0; i < DAILY_DAYS; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (DAILY_DAYS - 1 - i));
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of rows) {
      const key = row.created_at.slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.cost);
    }
    return {
      points: Array.from(buckets.entries()).map(([date, credits]) => ({
        label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
        credits,
      })),
    };
  }

  const buckets = new Map<string, number>();
  for (let i = 0; i < MONTHLY_MONTHS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHLY_MONTHS - 1 - i), 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.cost);
  }
  return {
    points: Array.from(buckets.entries()).map(([key, credits]) => {
      const [y, m] = key.split("-").map(Number);
      return { label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" }), credits };
    }),
  };
}

export type AiUsageLogRow = { id: string; actionType: AiActionType | string; cost: number; createdAt: string };
export type AiUsageLogPageResult = { rows: AiUsageLogRow[]; total: number } | { error: string };

const LOG_PAGE_SIZE = 10;

// Whole-workspace log, newest first, one page (10 rows) at a time -- see
// getAiUsageChart's doc comment for why this isn't scoped to the calling
// user. `page` is 0-indexed. Uses a Postgres exact count alongside the
// range query so the UI can render "Page X of Y" without a second
// round-trip.
export async function getAiUsageLogPage(page: number): Promise<AiUsageLogPageResult> {
  const ctx = await requireWorkspaceId();
  if (!ctx.ok) return { error: ctx.error };

  const from = page * LOG_PAGE_SIZE;
  const to = from + LOG_PAGE_SIZE - 1;

  const { data, error, count } = await ctx.supabase
    .from("ai_usage_log")
    .select("id, action_type, cost, created_at", { count: "exact" })
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { error: error.message };

  const rows = (data as { id: string; action_type: string; cost: number; created_at: string }[] | null) ?? [];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      actionType: r.action_type,
      cost: r.cost,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
  };
}

export type ClearAiUsageLogResult = { error?: string };

// Deletes only the history rows (ai_usage_log) -- never touches
// workspaces.ai_credits_used or the plan limit, so credit enforcement is
// unaffected; this just clears what's shown in the detailed log (and, as a
// side effect, the "Usage over time" chart and sidebar sparkline, since
// both are aggregated straight from this same table). Gated to
// owner/admin, consistent with other workspace-wide destructive settings
// actions.
export async function clearAiUsageLog(): Promise<ClearAiUsageLogResult> {
  const ctx = await requireWorkspaceIdWithRole();
  if (!ctx.ok) return { error: ctx.error };

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { error: "Only workspace owners and admins can clear the usage log." };
  }

  const { error } = await ctx.supabase.from("ai_usage_log").delete().eq("workspace_id", ctx.workspaceId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return {};
}
