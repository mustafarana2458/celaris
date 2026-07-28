"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export type TaskActionResult = { error?: string };

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
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

  return { supabase, workspace } as const;
}

function taskFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "todo").trim();
  const priorityRaw = String(formData.get("priority") ?? "medium").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();

  const status = (
    VALID_STATUSES.includes(statusRaw as TaskStatus) ? statusRaw : "todo"
  ) as TaskStatus;
  const priority = (
    VALID_PRIORITIES.includes(priorityRaw as TaskPriority) ? priorityRaw : "medium"
  ) as TaskPriority;

  return {
    title,
    description: description || null,
    status,
    priority,
    due_date: dueDate || null,
    project_id: projectId || null,
  };
}

export async function createTask(formData: FormData): Promise<TaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = taskFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }

  const { error } = await ctx.supabase.from("tasks").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}

export async function updateTask(
  id: string,
  formData: FormData
): Promise<TaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = taskFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }

  const { error } = await ctx.supabase
    .from("tasks")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<TaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }

  const { error } = await ctx.supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}

export async function deleteTask(id: string): Promise<TaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}
