"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { AiActionType } from "@/lib/aiCreditsCore";
import type { AiUsageChartView } from "@/lib/types";

type WorkspaceCtx = { ok: true; supabase: SupabaseClient; workspaceId: string } | { ok: false; error: string };

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
export type AiUsageLogPageResult = { rows: AiUsageLogRow[]; hasMore: boolean } | { error: string };

const LOG_PAGE_SIZE = 25;

// Whole-workspace log, newest first -- see getAiUsageChart's doc comment for
// why this isn't scoped to the calling user. Fetches one row past the page
// size to know whether "Load More" should render, without a separate count
// query.
export async function getAiUsageLogPage(offset: number): Promise<AiUsageLogPageResult> {
  const ctx = await requireWorkspaceId();
  if (!ctx.ok) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("ai_usage_log")
    .select("id, action_type, cost, created_at")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + LOG_PAGE_SIZE);

  if (error) return { error: error.message };

  const rows = (data as { id: string; action_type: string; cost: number; created_at: string }[] | null) ?? [];
  const hasMore = rows.length > LOG_PAGE_SIZE;

  return {
    rows: rows.slice(0, LOG_PAGE_SIZE).map((r) => ({
      id: r.id,
      actionType: r.action_type,
      cost: r.cost,
      createdAt: r.created_at,
    })),
    hasMore,
  };
}
