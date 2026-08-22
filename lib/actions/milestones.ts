"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";
import { requirePlanAllowsModule } from "@/lib/planLimits";

export type MilestoneActionResult = { error?: string };

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

async function requireProject(
  ctx: { supabase: Awaited<ReturnType<typeof createClient>>; workspace: { id: string } },
  projectId: string
) {
  const { data: project, error } = await ctx.supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (error || !project) {
    return { error: "Project not found." } as const;
  }
  return { ok: true } as const;
}

async function nextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  workspaceId: string
) {
  const { count } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("workspace_id", workspaceId);
  return count ?? 0;
}

export async function createMilestone(
  projectId: string,
  title: string,
  dueDate: string | null,
  ownerId?: string | null,
  deliverables?: string | null
): Promise<MilestoneActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "milestones");
  if (permError) return permError;

  const trimmed = title.trim();
  if (!trimmed) {
    return { error: "Milestone title is required." };
  }

  const projectCheck = await requireProject(ctx, projectId);
  if ("error" in projectCheck) return projectCheck;

  const position = await nextPosition(ctx.supabase, projectId, ctx.workspace.id);

  const { error } = await ctx.supabase.from("milestones").insert({
    project_id: projectId,
    workspace_id: ctx.workspace.id,
    title: trimmed,
    due_date: dueDate || null,
    position,
    owner_id: ownerId || null,
    deliverables: deliverables?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/projects/milestones");
  return {};
}

export async function toggleMilestone(id: string, isDone: boolean): Promise<MilestoneActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "milestones");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("milestones")
    .update({ is_done: isDone })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/projects/milestones");
  return {};
}

export async function deleteMilestone(id: string): Promise<MilestoneActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "milestones");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("milestones")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/projects/milestones");
  return {};
}
