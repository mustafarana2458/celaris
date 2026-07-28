"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callOllama } from "@/lib/ollama";
import type { DealStage, ProjectStatus, TaskStatus } from "@/lib/types";

export type AssistantResult = { answer?: string; error?: string };

const MAX_QUESTION_LENGTH = 500;

const DEAL_STAGES: DealStage[] = ["new", "qualified", "proposal", "won", "lost"];
const PROJECT_STATUSES: ProjectStatus[] = ["active", "on_hold", "completed"];
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

async function buildWorkspaceSummary(supabase: SupabaseClient, workspaceId: string) {
  const [contactsRes, dealsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
    supabase.from("contacts").select("type").eq("workspace_id", workspaceId),
    supabase.from("deals").select("stage, value").eq("workspace_id", workspaceId),
    supabase.from("projects").select("status").eq("workspace_id", workspaceId),
    supabase.from("tasks").select("status").eq("workspace_id", workspaceId),
    supabase.from("invoices").select("status, total").eq("workspace_id", workspaceId),
  ]);

  const contacts = (contactsRes.data ?? []) as { type: string }[];
  const deals = (dealsRes.data ?? []) as { stage: string; value: number | null }[];
  const projects = (projectsRes.data ?? []) as { status: string }[];
  const tasks = (tasksRes.data ?? []) as { status: string }[];
  const invoices = (invoicesRes.data ?? []) as { status: string; total: number }[];

  const leads = contacts.filter((c) => c.type === "lead").length;
  const customers = contacts.filter((c) => c.type === "customer").length;

  const dealsByStage = Object.fromEntries(
    DEAL_STAGES.map((s) => [s, { count: 0, value: 0 }])
  ) as Record<DealStage, { count: number; value: number }>;
  let pipelineValue = 0;
  for (const d of deals) {
    const stage = d.stage as DealStage;
    if (dealsByStage[stage]) {
      dealsByStage[stage].count += 1;
      dealsByStage[stage].value += d.value ?? 0;
    }
    if (stage !== "won" && stage !== "lost") {
      pipelineValue += d.value ?? 0;
    }
  }

  const projectsByStatus = Object.fromEntries(
    PROJECT_STATUSES.map((s) => [s, 0])
  ) as Record<ProjectStatus, number>;
  for (const p of projects) {
    const status = p.status as ProjectStatus;
    if (projectsByStatus[status] !== undefined) projectsByStatus[status] += 1;
  }

  const tasksByStatus = Object.fromEntries(
    TASK_STATUSES.map((s) => [s, 0])
  ) as Record<TaskStatus, number>;
  for (const t of tasks) {
    const status = t.status as TaskStatus;
    if (tasksByStatus[status] !== undefined) tasksByStatus[status] += 1;
  }

  let unpaidCount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let paidAmount = 0;
  for (const inv of invoices) {
    if (inv.status === "paid") {
      paidCount += 1;
      paidAmount += inv.total ?? 0;
    } else {
      unpaidCount += 1;
      unpaidAmount += inv.total ?? 0;
    }
  }

  return {
    contacts: { total: contacts.length, leads, customers },
    deals: { total: deals.length, pipelineValue, byStage: dealsByStage },
    projects: { total: projects.length, byStatus: projectsByStatus },
    tasks: { total: tasks.length, byStatus: tasksByStatus },
    invoices: { total: invoices.length, unpaidCount, unpaidAmount, paidCount, paidAmount },
  };
}

function formatSummary(summary: Awaited<ReturnType<typeof buildWorkspaceSummary>>) {
  const stageLine = DEAL_STAGES.map(
    (s) => `${s}: ${summary.deals.byStage[s].count} (${currency.format(summary.deals.byStage[s].value)})`
  ).join(", ");
  const projectLine = PROJECT_STATUSES.map(
    (s) => `${s}: ${summary.projects.byStatus[s]}`
  ).join(", ");
  const taskLine = TASK_STATUSES.map(
    (s) => `${s}: ${summary.tasks.byStatus[s]}`
  ).join(", ");

  return [
    `Contacts: ${summary.contacts.total} total (${summary.contacts.leads} leads, ${summary.contacts.customers} customers)`,
    `Deals: ${summary.deals.total} total, open pipeline value ${currency.format(summary.deals.pipelineValue)}`,
    `Deals by stage: ${stageLine}`,
    `Projects by status: ${projectLine}`,
    `Tasks by status: ${taskLine}`,
    `Invoices: ${summary.invoices.total} total, unpaid ${summary.invoices.unpaidCount} (${currency.format(summary.invoices.unpaidAmount)}), paid ${summary.invoices.paidCount} (${currency.format(summary.invoices.paidAmount)})`,
  ].join("\n");
}

function buildPrompt(summaryText: string, question: string) {
  return (
    `You are a business assistant answering questions about the user's CRM data. ` +
    `Use ONLY the data below to answer. Do not invent numbers, names, or details that are not present. ` +
    `The data below contains totals and counts only, not individual record names — if the question asks ` +
    `for something the data doesn't cover (like specific names), say the data doesn't include that detail.\n\n` +
    `Business data summary:\n${summaryText}\n\n` +
    `Question: ${question}\n\n` +
    `Answer concisely in 1-3 sentences, using only the data above.`
  );
}

export async function askAssistant(question: string): Promise<AssistantResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { error: "Please enter a question." };
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return { error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return { error: "No workspace found for this account." };
  }

  const summary = await buildWorkspaceSummary(supabase, workspace.id);
  const prompt = buildPrompt(formatSummary(summary), trimmed);

  const result = await callOllama(prompt);
  if (result.error) {
    return { error: result.error };
  }

  return { answer: result.text };
}
