"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { parseAssigneeKey } from "@/lib/assignee";
import type { DealStage } from "@/lib/types";

export type DealActionResult = { error?: string };

const VALID_STAGES: DealStage[] = ["new", "qualified", "proposal", "won", "lost"];

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

  return { supabase, workspace } as const;
}

function dealFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const contactId = String(formData.get("contact_id") ?? "").trim();
  const companyId = String(formData.get("company_id") ?? "").trim();
  const pipelineId = String(formData.get("pipeline_id") ?? "").trim();
  const ownerRef = parseAssigneeKey(String(formData.get("owner_assignee") ?? "").trim() || null);
  const valueRaw = String(formData.get("value") ?? "").trim();
  const winProbabilityRaw = String(formData.get("win_probability") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "new").trim();
  const expectedClose = String(formData.get("expected_close") ?? "").trim();

  const value = valueRaw === "" ? null : Number(valueRaw);
  const winProbabilityNum = winProbabilityRaw === "" ? null : Number(winProbabilityRaw);
  const winProbability =
    winProbabilityNum !== null && !Number.isNaN(winProbabilityNum)
      ? Math.max(0, Math.min(100, Math.round(winProbabilityNum)))
      : null;
  const stage = (VALID_STAGES.includes(stageRaw as DealStage) ? stageRaw : "new") as DealStage;

  return {
    title,
    contact_id: contactId || null,
    company_id: companyId || null,
    pipeline_id: pipelineId || null,
    // parseAssigneeKey() already re-derives this server-side from the
    // combined key -- never trust which of the two a client claims.
    owner_id: ownerRef?.kind === "user" ? ownerRef.id : null,
    owner_member_id: ownerRef?.kind === "directory" ? ownerRef.id : null,
    value: value !== null && !Number.isNaN(value) ? value : null,
    win_probability: winProbability,
    stage,
    expected_close: expectedClose || null,
  };
}

export async function createDeal(formData: FormData): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = dealFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }

  const { error } = await ctx.supabase.from("deals").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) {
    console.error("[createDeal] insert failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/deals");
  return {};
}

export async function updateDeal(
  id: string,
  formData: FormData
): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = dealFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }

  const { error } = await ctx.supabase
    .from("deals")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) {
    console.error("[updateDeal] update failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/deals");
  return {};
}

export async function updateDealStage(
  id: string,
  stage: DealStage
): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!VALID_STAGES.includes(stage)) {
    return { error: "Invalid stage." };
  }

  const { error } = await ctx.supabase
    .from("deals")
    .update({ stage })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function deleteDeal(id: string): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

// ── Bulk (multi-)assignment: tagging only in this phase, no access effect ──

export type DealAssignmentsResult = {
  assignees: { id: string; user_id: string | null; team_member_id: string | null }[];
  departments: { id: string; department_id: string }[];
  error?: string;
};

export async function getDealAssignments(dealId: string): Promise<DealAssignmentsResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return { assignees: [], departments: [], error: ctx.error };

  const [{ data: assignees, error: assigneesError }, { data: departments, error: departmentsError }] =
    await Promise.all([
      ctx.supabase
        .from("deal_assignees")
        .select("id, user_id, team_member_id")
        .eq("deal_id", dealId)
        .eq("workspace_id", ctx.workspace.id),
      ctx.supabase
        .from("deal_departments")
        .select("id, department_id")
        .eq("deal_id", dealId)
        .eq("workspace_id", ctx.workspace.id),
    ]);

  if (assigneesError || departmentsError) {
    return { assignees: [], departments: [], error: (assigneesError ?? departmentsError)?.message };
  }

  return { assignees: assignees ?? [], departments: departments ?? [] };
}

// `assignee` is the combined "user:<id>" / "directory:<id>" key from
// lib/assignee.ts, same convention as the single owner_id/owner_member_id.
export async function addDealAssignee(dealId: string, assignee: string): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const ref = parseAssigneeKey(assignee);
  if (!ref) return { error: "No member selected." };

  const { error } = await ctx.supabase.from("deal_assignees").insert({
    deal_id: dealId,
    workspace_id: ctx.workspace.id,
    user_id: ref.kind === "user" ? ref.id : null,
    team_member_id: ref.kind === "directory" ? ref.id : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function removeDealAssignee(id: string, dealId: string): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("deal_assignees")
    .delete()
    .eq("id", id)
    .eq("deal_id", dealId)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function addDealDepartment(dealId: string, departmentId: string): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase.from("deal_departments").insert({
    deal_id: dealId,
    workspace_id: ctx.workspace.id,
    department_id: departmentId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function removeDealDepartment(id: string, dealId: string): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("deal_departments")
    .delete()
    .eq("id", id)
    .eq("deal_id", dealId)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

