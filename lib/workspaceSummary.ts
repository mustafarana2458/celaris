import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealStage, ProjectStatus, TaskStatus } from "@/lib/types";

const DEAL_STAGES: DealStage[] = ["new", "qualified", "proposal", "won", "lost"];
const PROJECT_STATUSES: ProjectStatus[] = ["active", "on_hold", "completed"];
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type WorkspaceSummary = Awaited<ReturnType<typeof buildWorkspaceSummary>>;

export async function buildWorkspaceSummary(supabase: SupabaseClient, workspaceId: string) {
  const [contactsRes, dealsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
    supabase.from("contacts").select("type").eq("workspace_id", workspaceId),
    supabase.from("deals").select("stage, value").eq("workspace_id", workspaceId),
    supabase.from("projects").select("status").eq("workspace_id", workspaceId),
    supabase.from("tasks").select("status, due_date").eq("workspace_id", workspaceId),
    supabase.from("invoices").select("status, total").eq("workspace_id", workspaceId),
  ]);

  const contacts = (contactsRes.data ?? []) as { type: string }[];
  const deals = (dealsRes.data ?? []) as { stage: string; value: number | null }[];
  const projects = (projectsRes.data ?? []) as { status: string }[];
  const tasks = (tasksRes.data ?? []) as { status: string; due_date: string | null }[];
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdueTaskCount = 0;
  for (const t of tasks) {
    const status = t.status as TaskStatus;
    if (tasksByStatus[status] !== undefined) tasksByStatus[status] += 1;
    if (status !== "done" && t.due_date && new Date(`${t.due_date}T00:00:00`) < today) {
      overdueTaskCount += 1;
    }
  }

  let unpaidCount = 0;
  let unpaidAmount = 0;
  let overdueInvoiceCount = 0;
  let overdueInvoiceAmount = 0;
  let paidCount = 0;
  let paidAmount = 0;
  for (const inv of invoices) {
    if (inv.status === "paid") {
      paidCount += 1;
      paidAmount += inv.total ?? 0;
    } else if (inv.status === "overdue") {
      overdueInvoiceCount += 1;
      overdueInvoiceAmount += inv.total ?? 0;
    } else {
      unpaidCount += 1;
      unpaidAmount += inv.total ?? 0;
    }
  }

  return {
    contacts: { total: contacts.length, leads, customers },
    deals: { total: deals.length, pipelineValue, byStage: dealsByStage },
    projects: { total: projects.length, byStatus: projectsByStatus },
    tasks: { total: tasks.length, byStatus: tasksByStatus, overdueCount: overdueTaskCount },
    invoices: {
      total: invoices.length,
      unpaidCount,
      unpaidAmount,
      overdueCount: overdueInvoiceCount,
      overdueAmount: overdueInvoiceAmount,
      paidCount,
      paidAmount,
    },
  };
}

export function formatWorkspaceSummary(summary: WorkspaceSummary) {
  const stageLine = DEAL_STAGES.map(
    (s) =>
      `${s}: ${summary.deals.byStage[s].count} (${currency.format(summary.deals.byStage[s].value)})`
  ).join(", ");
  const projectLine = PROJECT_STATUSES.map(
    (s) => `${s}: ${summary.projects.byStatus[s]}`
  ).join(", ");

  return [
    `Contacts: ${summary.contacts.total} total (${summary.contacts.leads} leads, ${summary.contacts.customers} customers)`,
    `Deals: ${summary.deals.total} total, open pipeline value ${currency.format(summary.deals.pipelineValue)}`,
    `Deals by stage: ${stageLine}`,
    `Projects by status: ${projectLine}`,
    `Tasks: ${summary.tasks.byStatus.todo} to do, ${summary.tasks.byStatus.in_progress} in progress, ${summary.tasks.byStatus.done} done.`,
    `Of the tasks that are not done, ${summary.tasks.overdueCount} are overdue (past their due date).`,
    `Invoices: ${summary.invoices.total} total.`,
    `Unpaid invoices: ${summary.invoices.unpaidCount}, totaling ${currency.format(summary.invoices.unpaidAmount)}.`,
    `Overdue invoices: ${summary.invoices.overdueCount}, totaling ${currency.format(summary.invoices.overdueAmount)}.`,
    `Paid invoices: ${summary.invoices.paidCount}, totaling ${currency.format(summary.invoices.paidAmount)}.`,
  ].join("\n");
}
