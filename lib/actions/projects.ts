"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getProjectTemplate } from "@/lib/projectTemplates";
import type { ProjectStatus } from "@/lib/types";

export type ProjectActionResult = { error?: string };

const VALID_STATUSES: ProjectStatus[] = ["active", "on_hold", "completed"];

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

function projectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "active").trim();
  const status = (
    VALID_STATUSES.includes(statusRaw as ProjectStatus) ? statusRaw : "active"
  ) as ProjectStatus;

  return {
    name,
    description: description || null,
    status,
  };
}

function todayPlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = projectFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }

  const { data: project, error } = await ctx.supabase
    .from("projects")
    .insert({
      ...fields,
      workspace_id: ctx.workspace.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const templateId = String(formData.get("template_id") ?? "").trim();
  const template = templateId ? getProjectTemplate(templateId) : null;

  if (template) {
    if (template.milestones.length > 0) {
      const { error: milestonesError } = await ctx.supabase.from("milestones").insert(
        template.milestones.map((m, index) => ({
          project_id: project.id,
          workspace_id: ctx.workspace.id,
          title: m.title,
          due_date: todayPlusDays(m.dueInDays),
          position: index,
        }))
      );
      if (milestonesError) return { error: milestonesError.message };
    }

    if (template.tasks.length > 0) {
      const { error: tasksError } = await ctx.supabase.from("tasks").insert(
        template.tasks.map((t) => ({
          workspace_id: ctx.workspace.id,
          project_id: project.id,
          title: t.title,
          priority: t.priority,
          status: "todo",
        }))
      );
      if (tasksError) return { error: tasksError.message };
    }

    revalidatePath("/dashboard/tasks");
  }

  revalidatePath("/dashboard/projects");
  return {};
}

export async function updateProject(
  id: string,
  formData: FormData
): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = projectFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase
    .from("projects")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  return {};
}

export async function deleteProject(id: string): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  return {};
}
