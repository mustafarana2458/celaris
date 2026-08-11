"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";
import type { SalesTargetActionResult } from "@/lib/types";

async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." } as const;
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return { error: "No workspace found for this account." } as const;
  }

  return { supabase, workspace, userId: user.id } as const;
}

export async function createSalesTarget(formData: FormData): Promise<SalesTargetActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "deals", "forecasts");
  if (permError) return permError;

  const periodLabel = String(formData.get("period_label") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const revenueGoalRaw = String(formData.get("revenue_goal") ?? "").trim();
  const assignedTo = String(formData.get("assigned_to") ?? "").trim();
  const pipelineId = String(formData.get("pipeline_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!periodLabel || !periodStart || !periodEnd) {
    return { error: "Target period is required." };
  }

  const revenueGoal = Number(revenueGoalRaw);
  if (!revenueGoalRaw || Number.isNaN(revenueGoal) || revenueGoal < 0) {
    return { error: "Enter a valid revenue goal." };
  }

  const { data, error } = await ctx.supabase
    .from("sales_targets")
    .insert({
      workspace_id: ctx.workspace.id,
      period_label: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
      revenue_goal: revenueGoal,
      assigned_to: assignedTo || null,
      pipeline_id: pipelineId || null,
      notes: notes || null,
      created_by: ctx.userId,
    })
    .select("*, assignee:users!assigned_to(id, full_name), pipelines!pipeline_id(id, name)")
    .single();

  if (error) {
    console.error("[createSalesTarget] insert failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/deals/forecasts");
  return { target: data };
}

export async function deleteSalesTarget(id: string): Promise<SalesTargetActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "deals", "forecasts");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("sales_targets")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals/forecasts");
  return {};
}
