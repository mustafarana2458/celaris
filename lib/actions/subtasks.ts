"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type SubtaskActionResult = { error?: string };

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

async function requireTask(
  ctx: { supabase: Awaited<ReturnType<typeof createClient>>; workspace: { id: string } },
  taskId: string
) {
  const { data: task, error } = await ctx.supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found." } as const;
  }
  return { ok: true } as const;
}

async function nextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  workspaceId: string
) {
  const { count } = await supabase
    .from("subtasks")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("workspace_id", workspaceId);
  return count ?? 0;
}

export async function createSubtask(taskId: string, title: string): Promise<SubtaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const trimmed = title.trim();
  if (!trimmed) {
    return { error: "Sub-task title is required." };
  }

  const taskCheck = await requireTask(ctx, taskId);
  if ("error" in taskCheck) return taskCheck;

  const position = await nextPosition(ctx.supabase, taskId, ctx.workspace.id);

  const { error } = await ctx.supabase.from("subtasks").insert({
    task_id: taskId,
    workspace_id: ctx.workspace.id,
    title: trimmed,
    position,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}

export async function createSubtasksBulk(
  taskId: string,
  titles: string[]
): Promise<SubtaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const cleaned = titles.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { error: "No sub-task titles to add." };
  }

  const taskCheck = await requireTask(ctx, taskId);
  if ("error" in taskCheck) return taskCheck;

  const startPosition = await nextPosition(ctx.supabase, taskId, ctx.workspace.id);

  const { error } = await ctx.supabase.from("subtasks").insert(
    cleaned.map((title, index) => ({
      task_id: taskId,
      workspace_id: ctx.workspace.id,
      title,
      position: startPosition + index,
    }))
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}

export async function toggleSubtask(id: string, isDone: boolean): Promise<SubtaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("subtasks")
    .update({ is_done: isDone })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}

export async function deleteSubtask(id: string): Promise<SubtaskActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("subtasks")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  return {};
}
