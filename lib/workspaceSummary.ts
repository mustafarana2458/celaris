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

export type WorkspaceSummaryVisibility = { contacts: boolean; deals: boolean; revenue: boolean };

const FULLY_VISIBLE: WorkspaceSummaryVisibility = { contacts: true, deals: true, revenue: true };

export type WorkspaceSummary = Awaited<ReturnType<typeof buildWorkspaceSummary>>;

// `visibility` mirrors the dashboard's contacts_kpis/deals_kpis/revenue_kpis
// gates (see app/dashboard/page.tsx) -- callers that feed this into an AI
// prompt must pass the caller's actual permissions so a View-Only member's
// revenue/deals/contacts figures never reach the model (and therefore never
// reach the AI's text response). Defaults to fully open so existing callers
// that haven't opted into gating yet (lib/actions/assistant.ts) are
// unaffected.
export async function buildWorkspaceSummary(
  supabase: SupabaseClient,
  workspaceId: string,
  visibility: WorkspaceSummaryVisibility = FULLY_VISIBLE
) {
  const [contactsRes, dealsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
    visibility.contacts
      ? supabase.from("contacts").select("type").eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] as { type: string }[], error: null }),
    visibility.deals
      ? supabase.from("deals").select("stage, value").eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] as { stage: string; value: number | null }[], error: null }),
    supabase.from("projects").select("status").eq("workspace_id", workspaceId),
    supabase.from("tasks").select("status, due_date").eq("workspace_id", workspaceId),
    visibility.revenue
      ? supabase.from("invoices").select("status, total").eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] as { status: string; total: number }[], error: null }),
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
    contacts: visibility.contacts ? { total: contacts.length, leads, customers } : null,
    deals: visibility.deals ? { total: deals.length, pipelineValue, byStage: dealsByStage } : null,
    projects: { total: projects.length, byStatus: projectsByStatus },
    tasks: { total: tasks.length, byStatus: tasksByStatus, overdueCount: overdueTaskCount },
    invoices: visibility.revenue
      ? {
          total: invoices.length,
          unpaidCount,
          unpaidAmount,
          overdueCount: overdueInvoiceCount,
          overdueAmount: overdueInvoiceAmount,
          paidCount,
          paidAmount,
        }
      : null,
  };
}

export function formatWorkspaceSummary(summary: WorkspaceSummary) {
  const lines: string[] = [];

  const { contacts, deals, projects, tasks, invoices } = summary;

  if (contacts) {
    lines.push(`Contacts: ${contacts.total} total (${contacts.leads} leads, ${contacts.customers} customers)`);
  }

  if (deals) {
    const stageLine = DEAL_STAGES.map(
      (s) => `${s}: ${deals.byStage[s].count} (${currency.format(deals.byStage[s].value)})`
    ).join(", ");
    lines.push(`Deals: ${deals.total} total, open pipeline value ${currency.format(deals.pipelineValue)}`);
    lines.push(`Deals by stage: ${stageLine}`);
  }

  const projectLine = PROJECT_STATUSES.map((s) => `${s}: ${projects.byStatus[s]}`).join(", ");
  lines.push(`Projects by status: ${projectLine}`);

  lines.push(
    `Tasks: ${tasks.byStatus.todo} to do, ${tasks.byStatus.in_progress} in progress, ${tasks.byStatus.done} done.`
  );
  lines.push(`Of the tasks that are not done, ${tasks.overdueCount} are overdue (past their due date).`);

  if (invoices) {
    lines.push(`Invoices: ${invoices.total} total.`);
    lines.push(`Unpaid invoices: ${invoices.unpaidCount}, totaling ${currency.format(invoices.unpaidAmount)}.`);
    lines.push(`Overdue invoices: ${invoices.overdueCount}, totaling ${currency.format(invoices.overdueAmount)}.`);
    lines.push(`Paid invoices: ${invoices.paidCount}, totaling ${currency.format(invoices.paidAmount)}.`);
  }

  return lines.join("\n");
}
