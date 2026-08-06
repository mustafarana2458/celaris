"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callGroq } from "@/lib/groq";
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

// TipTap emits "<p></p>" (or a run of empty paragraphs) for a blank editor --
// treat that the same as no description instead of storing empty markup.
function normalizeDescription(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/<[^>]+>/g, "").trim();
  return stripped ? trimmed : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function taskFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "todo").trim();
  const priorityRaw = String(formData.get("priority") ?? "medium").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const assignedTo = String(formData.get("assigned_to") ?? "").trim();

  const status = (
    VALID_STATUSES.includes(statusRaw as TaskStatus) ? statusRaw : "todo"
  ) as TaskStatus;
  const priority = (
    VALID_PRIORITIES.includes(priorityRaw as TaskPriority) ? priorityRaw : "medium"
  ) as TaskPriority;

  return {
    title,
    description: normalizeDescription(description),
    status,
    priority,
    due_date: dueDate || null,
    project_id: projectId || null,
    assigned_to: assignedTo || null,
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

export type BreakdownTaskResult = { titles?: string[]; error?: string };

function buildBreakdownPrompt(title: string, description: string | null) {
  const descLine = description?.trim()
    ? `Description: ${description.trim()}`
    : "No description was given — use your best judgement based on the title alone.";

  return (
    `You are a project assistant. Break the following task down into 3 to 6 small, ` +
    `actionable sub-tasks. Each sub-task title should be short (under 8 words) and start ` +
    `with a verb.\n\n` +
    `Task title: ${title}\n` +
    `${stripHtml(descLine)}\n\n` +
    `Respond with ONLY valid JSON in exactly this shape, no markdown, no extra text: ` +
    `{"subtasks": ["first sub-task", "second sub-task"]}`
  );
}

function parseBreakdownResponse(text: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (typeof parsed !== "object" || parsed === null || !("subtasks" in parsed)) {
    return null;
  }

  const raw = (parsed as { subtasks: unknown }).subtasks;
  if (!Array.isArray(raw)) return null;

  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

export async function breakdownTask(id: string): Promise<BreakdownTaskResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { data: task, error: taskError } = await ctx.supabase
    .from("tasks")
    .select("title, description")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle<{ title: string; description: string | null }>();

  if (taskError || !task) {
    return { error: "Task not found." };
  }

  const result = await callGroq(
    buildBreakdownPrompt(task.title, task.description),
    { temperature: 0.4 },
    "json"
  );
  if (result.error || !result.text) {
    return { error: result.error ?? "The AI didn't return a response. Please try again." };
  }

  const titles = parseBreakdownResponse(result.text);
  if (!titles || titles.length === 0) {
    return {
      error: "Couldn't break this task down. Try adding more detail to the title or description.",
    };
  }

  return { titles };
}
