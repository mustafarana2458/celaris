"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";
import { requirePlanAllowsModule } from "@/lib/planLimits";
import { getProjectTemplate } from "@/lib/projectTemplates";
import { parseAssigneeKey } from "@/lib/assignee";
import type { ProjectHealth, ProjectStatus, ProjectTemplateStructure, TaskPriority } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectActionResult = { error?: string };

const VALID_STATUSES: ProjectStatus[] = ["active", "on_hold", "completed"];
const VALID_HEALTHS: ProjectHealth[] = ["on_track", "at_risk", "delayed"];

type TemplateSeed = {
  milestones: { title: string; dueInDays: number }[];
  tasks: { title: string; priority: TaskPriority }[];
};

// Built-in templates (lib/projectTemplates.ts) are flat: milestones and
// tasks are separate arrays with no link between them. DB templates
// (project_templates.structure) nest tasks under their milestone, to
// support the task-builder UI. Both flatten to the same seed shape here so
// the insert logic below doesn't care which source a project came from.
async function resolveTemplateSeed(
  supabase: SupabaseClient,
  workspaceId: string,
  templateId: string
): Promise<TemplateSeed | null> {
  const builtIn = getProjectTemplate(templateId);
  if (builtIn) {
    return { milestones: builtIn.milestones, tasks: builtIn.tasks };
  }

  const { data } = await supabase
    .from("project_templates")
    .select("structure")
    .eq("id", templateId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<{ structure: ProjectTemplateStructure }>();

  if (!data?.structure?.milestones) return null;

  const milestones = data.structure.milestones.map((m) => ({ title: m.title, dueInDays: m.dueInDays }));
  const tasks = data.structure.milestones.flatMap((m) => m.tasks);
  return { milestones, tasks };
}

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

  // "client_id" -- the field is named after the reused CompanyCombobox's
  // hidden input (it emits `company_id`), not the `client_id` DB column.
  const clientId = String(formData.get("company_id") ?? "").trim();
  const dealId = String(formData.get("deal_id") ?? "").trim();
  const leadRef = parseAssigneeKey(String(formData.get("lead_assignee") ?? "").trim() || null);
  const startDate = String(formData.get("start_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const healthRaw = String(formData.get("health") ?? "").trim();

  const budgetNum = budgetRaw === "" ? null : Number(budgetRaw);
  const budget = budgetNum !== null && !Number.isNaN(budgetNum) ? budgetNum : null;
  const health = (VALID_HEALTHS.includes(healthRaw as ProjectHealth) ? healthRaw : null) as ProjectHealth | null;

  return {
    name,
    description: description || null,
    status,
    client_id: clientId || null,
    deal_id: dealId || null,
    // parseAssigneeKey() already re-derives this server-side from the
    // combined key -- never trust which of the two a client claims.
    lead_id: leadRef?.kind === "user" ? leadRef.id : null,
    lead_member_id: leadRef?.kind === "directory" ? leadRef.id : null,
    start_date: startDate || null,
    due_date: dueDate || null,
    budget,
    health,
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

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const fields = projectFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }
  if (!fields.client_id) {
    return { error: "Client is required." };
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
  const seed = templateId ? await resolveTemplateSeed(ctx.supabase, ctx.workspace.id, templateId) : null;

  if (seed) {
    if (seed.milestones.length > 0) {
      const { error: milestonesError } = await ctx.supabase.from("milestones").insert(
        seed.milestones.map((m, index) => ({
          project_id: project.id,
          workspace_id: ctx.workspace.id,
          title: m.title,
          due_date: todayPlusDays(m.dueInDays),
          position: index,
        }))
      );
      if (milestonesError) return { error: milestonesError.message };
    }

    if (seed.tasks.length > 0) {
      const { error: tasksError } = await ctx.supabase.from("tasks").insert(
        seed.tasks.map((t) => ({
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

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const fields = projectFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }
  if (!fields.client_id) {
    return { error: "Client is required." };
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

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  return {};
}

// ── Bulk (multi-)assignment: tagging only in this phase, no access effect ──

export type ProjectAssignmentsResult = {
  assignees: { id: string; user_id: string | null; team_member_id: string | null }[];
  departments: { id: string; department_id: string }[];
  error?: string;
};

export async function getProjectAssignments(projectId: string): Promise<ProjectAssignmentsResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return { assignees: [], departments: [], error: ctx.error };

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return { assignees: [], departments: [], error: planError.error };

  const [{ data: assignees, error: assigneesError }, { data: departments, error: departmentsError }] =
    await Promise.all([
      ctx.supabase
        .from("project_assignees")
        .select("id, user_id, team_member_id")
        .eq("project_id", projectId)
        .eq("workspace_id", ctx.workspace.id),
      ctx.supabase
        .from("project_departments")
        .select("id, department_id")
        .eq("project_id", projectId)
        .eq("workspace_id", ctx.workspace.id),
    ]);

  if (assigneesError || departmentsError) {
    return { assignees: [], departments: [], error: (assigneesError ?? departmentsError)?.message };
  }

  return { assignees: assignees ?? [], departments: departments ?? [] };
}

// `assignee` is the combined "user:<id>" / "directory:<id>" key from
// lib/assignee.ts, same convention as the single lead_id/lead_member_id.
export async function addProjectAssignee(projectId: string, assignee: string): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const ref = parseAssigneeKey(assignee);
  if (!ref) return { error: "No member selected." };

  const { error } = await ctx.supabase.from("project_assignees").insert({
    project_id: projectId,
    workspace_id: ctx.workspace.id,
    user_id: ref.kind === "user" ? ref.id : null,
    team_member_id: ref.kind === "directory" ? ref.id : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return {};
}

export async function removeProjectAssignee(id: string, projectId: string): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("project_assignees")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return {};
}

export async function addProjectDepartment(
  projectId: string,
  departmentId: string
): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const { error } = await ctx.supabase.from("project_departments").insert({
    project_id: projectId,
    workspace_id: ctx.workspace.id,
    department_id: departmentId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return {};
}

export async function removeProjectDepartment(id: string, projectId: string): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "projects");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "projects", "all_projects");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("project_departments")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return {};
}
