"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
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

export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = projectFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase.from("projects").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

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
