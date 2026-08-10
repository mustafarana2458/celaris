"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";
import type {
  ProjectTemplateActionResult,
  ProjectTemplateStructure,
  TaskPriority,
} from "@/lib/types";

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

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

// The builder posts its in-progress tree as a JSON string in a hidden
// field -- never trust it as-is, since it's client-authored. Reject
// anything malformed rather than silently coercing it into something
// that "mostly works."
function parseStructure(raw: string): ProjectTemplateStructure | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { milestones?: unknown }).milestones)) {
    return null;
  }

  const milestones = (parsed as { milestones: unknown[] }).milestones;
  const cleaned: ProjectTemplateStructure["milestones"] = [];

  for (const m of milestones) {
    if (typeof m !== "object" || m === null) return null;
    const title = String((m as { title?: unknown }).title ?? "").trim();
    if (!title) return null;
    const dueInDaysRaw = Number((m as { dueInDays?: unknown }).dueInDays);
    const dueInDays = Number.isFinite(dueInDaysRaw) && dueInDaysRaw >= 0 ? dueInDaysRaw : 0;

    const tasksRaw = (m as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasksRaw)) return null;
    const tasks: { title: string; priority: TaskPriority }[] = [];
    for (const t of tasksRaw) {
      if (typeof t !== "object" || t === null) return null;
      const taskTitle = String((t as { title?: unknown }).title ?? "").trim();
      if (!taskTitle) return null;
      const priorityRaw = String((t as { priority?: unknown }).priority ?? "medium");
      const priority = (VALID_PRIORITIES.includes(priorityRaw as TaskPriority) ? priorityRaw : "medium") as TaskPriority;
      tasks.push({ title: taskTitle, priority });
    }

    cleaned.push({ title, dueInDays, tasks });
  }

  return { milestones: cleaned };
}

function templateSelect() {
  return "id, workspace_id, name, description, estimated_duration_days, structure, created_by, created_at, updated_at";
}

export async function createProjectTemplate(formData: FormData): Promise<ProjectTemplateActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "projects", "project_templates");
  if (permError) return permError;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Template name is required." };

  const description = String(formData.get("description") ?? "").trim();
  const durationRaw = String(formData.get("estimated_duration_days") ?? "").trim();
  const durationNum = durationRaw === "" ? null : Number(durationRaw);
  const estimatedDurationDays = durationNum !== null && Number.isFinite(durationNum) ? Math.round(durationNum) : null;

  const structure = parseStructure(String(formData.get("structure") ?? ""));
  if (!structure) return { error: "At least one milestone with a title is required." };
  if (structure.milestones.length === 0) return { error: "Add at least one milestone phase." };

  const { data, error } = await ctx.supabase
    .from("project_templates")
    .insert({
      workspace_id: ctx.workspace.id,
      name,
      description: description || null,
      estimated_duration_days: estimatedDurationDays,
      structure,
      created_by: ctx.userId,
    })
    .select(templateSelect())
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects/templates");
  revalidatePath("/dashboard/projects");
  return { template: data as never };
}

export async function updateProjectTemplate(id: string, formData: FormData): Promise<ProjectTemplateActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "projects", "project_templates");
  if (permError) return permError;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Template name is required." };

  const description = String(formData.get("description") ?? "").trim();
  const durationRaw = String(formData.get("estimated_duration_days") ?? "").trim();
  const durationNum = durationRaw === "" ? null : Number(durationRaw);
  const estimatedDurationDays = durationNum !== null && Number.isFinite(durationNum) ? Math.round(durationNum) : null;

  const structure = parseStructure(String(formData.get("structure") ?? ""));
  if (!structure) return { error: "At least one milestone with a title is required." };
  if (structure.milestones.length === 0) return { error: "Add at least one milestone phase." };

  const { data, error } = await ctx.supabase
    .from("project_templates")
    .update({
      name,
      description: description || null,
      estimated_duration_days: estimatedDurationDays,
      structure,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .select(templateSelect())
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects/templates");
  revalidatePath("/dashboard/projects");
  return { template: data as never };
}

export async function deleteProjectTemplate(id: string): Promise<ProjectTemplateActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "projects", "project_templates");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("project_templates")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects/templates");
  revalidatePath("/dashboard/projects");
  return {};
}
