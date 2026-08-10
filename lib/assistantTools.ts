import type { SupabaseClient } from "@supabase/supabase-js";
import { createContact, listContacts } from "@/lib/actions/contacts";
import { createTask } from "@/lib/actions/tasks";
import { createDeal } from "@/lib/actions/deals";
import { getProjectProgress } from "@/lib/projectProgress";
import type { ContactType, DealStage, TaskPriority } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---- Read tools: workspace-scoped queries, deterministic natural-language templates ----

export async function runListContacts(
  params: { type?: ContactType | null; search?: string | null }
): Promise<string> {
  const result = await listContacts({
    type: params.type ?? "all",
    search: params.search ?? "",
    page: 1,
    pageSize: 10,
  });

  if ("error" in result) return `I couldn't look up contacts: ${result.error}`;
  if (result.total === 0) return "I couldn't find any matching contacts.";

  const lines = result.contacts.map((c) => {
    const detail = c.company || c.email || null;
    return `- ${c.name}${detail ? ` (${detail})` : ""} · ${c.type}`;
  });
  const more = result.total > result.contacts.length ? `\n...and ${result.total - result.contacts.length} more.` : "";
  return `Found ${result.total} matching contact${result.total === 1 ? "" : "s"}:\n${lines.join("\n")}${more}`;
}

export async function runListDeals(
  supabase: SupabaseClient,
  workspaceId: string,
  params: { stage?: DealStage | null },
  canSeeValue: boolean
): Promise<string> {
  let q = supabase
    .from("deals")
    .select(canSeeValue ? "title, value, stage, contacts(name)" : "title, stage, contacts(name)", {
      count: "exact",
    })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (params.stage) q = q.eq("stage", params.stage);

  const { data, count, error } = await q;
  if (error) return `I couldn't look up deals: ${error.message}`;

  const deals = (data ?? []) as unknown as {
    title: string;
    value?: number | null;
    stage: string;
    contacts: { name: string } | null;
  }[];
  if (deals.length === 0) return "I couldn't find any matching deals.";

  const lines = deals.map((d) => {
    const valueSegment = canSeeValue ? ` · ${d.value != null ? currency.format(d.value) : "no value set"}` : "";
    return `- ${d.title} · ${d.stage}${valueSegment}${d.contacts?.name ? ` · ${d.contacts.name}` : ""}`;
  });
  const total = count ?? deals.length;
  const more = total > deals.length ? `\n...and ${total - deals.length} more.` : "";
  return `Found ${total} matching deal${total === 1 ? "" : "s"}:\n${lines.join("\n")}${more}`;
}

export async function runUpcomingTasks(supabase: SupabaseClient, workspaceId: string): Promise<string> {
  const { data, error } = await supabase
    .from("tasks")
    .select("title, due_date, priority, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "done")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(10);

  if (error) return `I couldn't look up tasks: ${error.message}`;

  const tasks = (data ?? []) as { title: string; due_date: string | null; priority: string; status: string }[];
  if (tasks.length === 0) return "You have no upcoming tasks with a due date.";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lines = tasks.map((t) => {
    const overdue = t.due_date && new Date(`${t.due_date}T00:00:00`) < today;
    return `- ${t.title} · due ${formatDate(t.due_date)}${overdue ? " · overdue" : ""} · ${t.priority} priority`;
  });
  return `Here are your upcoming tasks:\n${lines.join("\n")}`;
}

export async function runOverdueInvoices(
  supabase: SupabaseClient,
  workspaceId: string,
  canSeeAmounts: boolean
): Promise<string> {
  if (!canSeeAmounts) {
    return "You don't have access to invoice/revenue data.";
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number, total, due_date, status, contacts(name)")
    .eq("workspace_id", workspaceId)
    .or(`status.eq.overdue,and(status.eq.unpaid,due_date.lt.${today})`)
    .order("due_date", { ascending: true })
    .limit(10);

  if (error) return `I couldn't look up invoices: ${error.message}`;

  const invoices = (data ?? []) as unknown as {
    invoice_number: string;
    total: number;
    due_date: string | null;
    contacts: { name: string } | null;
  }[];
  if (invoices.length === 0) return "You have no overdue invoices. 🎉";

  const lines = invoices.map(
    (i) =>
      `- ${i.invoice_number} · ${currency.format(i.total)}${i.contacts?.name ? ` · ${i.contacts.name}` : ""} · due ${formatDate(i.due_date)}`
  );
  return `Here are your overdue invoices:\n${lines.join("\n")}`;
}

export async function runProjectProgress(
  supabase: SupabaseClient,
  workspaceId: string,
  params: { project_name?: string | null }
): Promise<string> {
  const name = (params.project_name ?? "").trim();
  if (!name) return "Which project would you like the progress for?";

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, status, milestones(is_done), tasks(status)")
    .eq("workspace_id", workspaceId)
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();

  if (error) return `I couldn't look up that project: ${error.message}`;
  if (!project) return `I couldn't find a project called "${name}".`;

  const progress = getProjectProgress(project.milestones ?? [], project.tasks ?? []);
  const parts = [`${project.name} is ${progress.percent}% complete (${project.status}).`];
  if (progress.milestonesTotal > 0) {
    parts.push(`${progress.milestonesDone}/${progress.milestonesTotal} milestones done.`);
  }
  if (progress.tasksTotal > 0) {
    parts.push(`${progress.tasksDone}/${progress.tasksTotal} linked tasks done.`);
  }
  if (progress.milestonesTotal === 0 && progress.tasksTotal === 0) {
    parts.push("No milestones or tasks logged yet.");
  }
  return parts.join(" ");
}

// ---- Write tools: preview text (shown before confirming) ----

export type CreateContactParams = {
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  type: ContactType;
};

export type CreateTaskParams = {
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority | null;
};

export type CreateDealParams = {
  title: string;
  value: number | null;
  stage: DealStage | null;
  contact_id: string | null;
  contact_name: string | null;
};

export function previewCreateContact(p: CreateContactParams): string {
  const details = [p.type, p.email, p.phone, p.company_name].filter(Boolean).join(" · ");
  return `I'll create a new contact: **${p.name}**${details ? ` (${details})` : ""}. Create it?`;
}

export function previewCreateTask(p: CreateTaskParams): string {
  const details = [
    p.due_date ? `due ${formatDate(p.due_date)}` : null,
    p.priority ? `${p.priority} priority` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `I'll create a task: **${p.title}**${details ? ` (${details})` : ""}. Create it?`;
}

export function previewCreateDeal(p: CreateDealParams): string {
  const details = [
    p.value != null ? currency.format(p.value) : null,
    p.stage ?? "new",
    p.contact_name ? `linked to ${p.contact_name}${!p.contact_id ? " (not found, will be unlinked)" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `I'll create a deal: **${p.title}**${details ? ` (${details})` : ""}. Create it?`;
}

// ---- Write tools: execute via the real, existing server actions ----

export async function executeCreateContact(p: CreateContactParams): Promise<string> {
  const fd = new FormData();
  fd.set("name", p.name);
  if (p.email) fd.set("email", p.email);
  if (p.phone) fd.set("phone", p.phone);
  if (p.company_name) fd.set("company_name", p.company_name);
  fd.set("type", p.type);

  const result = await createContact(fd);
  if (result.error) return `Couldn't create that contact: ${result.error}`;
  return `Created contact **${p.name}**.`;
}

export async function executeCreateTask(p: CreateTaskParams): Promise<string> {
  const fd = new FormData();
  fd.set("title", p.title);
  if (p.description) fd.set("description", p.description);
  if (p.due_date) fd.set("due_date", p.due_date);
  if (p.priority) fd.set("priority", p.priority);

  const result = await createTask(fd);
  if (result.error) return `Couldn't create that task: ${result.error}`;
  return `Created task **${p.title}**${p.due_date ? ` due ${formatDate(p.due_date)}` : ""}.`;
}

export async function executeCreateDeal(p: CreateDealParams): Promise<string> {
  const fd = new FormData();
  fd.set("title", p.title);
  if (p.value != null) fd.set("value", String(p.value));
  fd.set("stage", p.stage ?? "new");
  if (p.contact_id) fd.set("contact_id", p.contact_id);

  const result = await createDeal(fd);
  if (result.error) return `Couldn't create that deal: ${result.error}`;
  return `Created deal **${p.title}**${p.value != null ? ` (${currency.format(p.value)})` : ""}.`;
}

export async function resolveContactIdByName(
  supabase: SupabaseClient,
  workspaceId: string,
  name: string | null
): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("name", `%${name.trim()}%`)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
