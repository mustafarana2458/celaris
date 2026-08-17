"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace, type CurrentWorkspace } from "@/lib/workspace";
import { hasModuleAccess } from "@/lib/permissions";
import { callGroq, type GroqMessage } from "@/lib/groq";
import { buildWorkspaceSummary, formatWorkspaceSummary } from "@/lib/workspaceSummary";
import {
  executeCreateCompany,
  executeCreateContact,
  executeCreateDeal,
  executeCreateInvoice,
  executeCreateProject,
  executeCreateTask,
  previewCreateCompany,
  previewCreateContact,
  previewCreateDeal,
  previewCreateInvoice,
  previewCreateProject,
  previewCreateTask,
  resolveCompanyIdByName,
  resolveContactIdByName,
  runListContacts,
  runListDeals,
  runOverdueInvoices,
  runProjectProgress,
  runUpcomingTasks,
  suggestInvoiceNumber,
  type CreateCompanyParams,
  type CreateContactParams,
  type CreateDealParams,
  type CreateInvoiceParams,
  type CreateProjectParams,
  type CreateTaskParams,
  type ExecuteResult,
} from "@/lib/assistantTools";
import { deductAiCredits, getRemainingCreditsAfter, requireAiCredits, resetCreditsIfDue, type RemainingCredits } from "@/lib/aiCredits";
import type { ReadTool, WriteTool } from "@/lib/assistantToolLabels";
import type { CompanyIndustry, CompanySize, ContactType, DealStage, ProjectStatus, TaskPriority } from "@/lib/types";

const MAX_QUESTION_LENGTH = 500;

export type AssistantAnswer = {
  kind: "answer";
  text: string;
  tool?: ReadTool | WriteTool;
  // Set whenever an AI credit was actually deducted for this response
  // (Phase 4 will use this for the "-2 AI Credits" chat tag + remaining
  // count). Absent when nothing was deducted (errors, clarify questions).
  credits?: RemainingCredits;
};
export type AssistantConfirm = {
  kind: "confirm";
  tool: WriteTool;
  params:
    | CreateContactParams
    | CreateTaskParams
    | CreateDealParams
    | CreateCompanyParams
    | CreateProjectParams
    | CreateInvoiceParams;
  preview: string;
  // The chat/classification credit (1) that already ran to produce this
  // preview -- charged regardless of whether the user goes on to confirm or
  // cancel. The create-specific cost is separate and only charged in
  // confirmAssistantAction, once the user actually confirms.
  credits?: RemainingCredits;
};
export type AssistantActionResult = AssistantAnswer | AssistantConfirm | { error: string };

type RawIntent = {
  tool?: string;
  answer?: string;
  question?: string;
  params?: Record<string, unknown>;
};

function buildIntentPrompt(summaryText: string, todayISO: string, question: string) {
  return `You are a business assistant for a CRM app. For every user message, respond with ONLY one JSON object choosing exactly one action below — no markdown, no extra text.

Today's date is ${todayISO}.

Business data summary (use this for direct answers, do not invent numbers not shown here):
${summaryText}

Available actions:
1. {"tool":"chat","answer":"<direct answer using ONLY the summary data above>"} - for questions the summary already answers (counts, totals, pipeline value, invoice totals, etc.)
2. {"tool":"list_contacts","params":{"type":"lead"|"customer"|null,"search":"<text or null>"}} - when the user wants actual contact names
3. {"tool":"list_deals","params":{"stage":"new"|"qualified"|"proposal"|"won"|"lost"|null}} - when the user wants actual deal names/details
4. {"tool":"upcoming_tasks","params":{}} - when the user wants their upcoming or overdue tasks
5. {"tool":"overdue_invoices","params":{}} - when the user wants overdue/unpaid invoice details
6. {"tool":"project_progress","params":{"project_name":"<name>"}} - when the user asks about a specific project's progress
7. {"tool":"create_contact","params":{"name":"<required>","email":null,"phone":null,"company_name":null,"type":"lead"|"customer"}} - when the user wants to add a new PERSON (a lead or a customer contact). "company_name" here is only a free-text label attached to that person, e.g. where they work — it does NOT create a company record. NEVER use this tool for a request to add a company/organization/business itself — use create_company for that instead.
8. {"tool":"create_company","params":{"name":"<required>","website":null,"industry":"Tech"|"Finance"|"Retail"|"Healthcare"|"Other"|null,"size":"1-10"|"11-50"|"51-200"|"200+"|null,"location":null}} - when the user wants to add a new COMPANY, business, organization, client account, or firm — a business entity, not a person. Trigger words: "company", "business", "organization", "client company", "account" (as in company account). If the name given is a business/brand name rather than a person's name, prefer this over create_contact.
9. {"tool":"create_task","params":{"title":"<required>","description":null,"due_date":"<YYYY-MM-DD or null, resolve relative dates like 'tomorrow' using today's date above>","priority":"low"|"medium"|"high"|"urgent"|null}} - when the user wants to create a task (a to-do item)
10. {"tool":"create_deal","params":{"title":"<required>","value":<number or null>,"stage":"new"|"qualified"|"proposal"|"won"|"lost"|null,"contact_name":"<name or null>"}} - when the user wants to create a sales deal/opportunity
11. {"tool":"create_project","params":{"name":"<required>","company_name":"<required — the existing client/company this project is for>","description":null,"due_date":null,"status":"active"|"on_hold"|"completed"|null}} - when the user wants to create a project. A project always belongs to an existing company/client, so company_name is required — if the user doesn't name one, use "clarify" and ask which client/company the project is for.
12. {"tool":"create_invoice","params":{"contact_name":"<name or null>","amount":<number, required>,"description":"<line item description, or null to default to \"Services\">","due_date":"<YYYY-MM-DD or null>"}} - when the user wants to create/send an invoice or bill someone. If no amount is given, use "clarify" and ask for the amount.
13. {"tool":"clarify","question":"<a short question asking for the missing info>"} - when the user clearly wants to create something but required info is missing (like a task with no title, a project with no company, or an invoice with no amount)

Disambiguation rule (read carefully — this is the most common mistake): a request to add/create a COMPANY, business, or organization must ALWAYS map to create_company, never to create_contact, even though create_contact also has a "company_name" field. Only use create_contact when the user is adding a specific person (a named individual).

Respond with ONLY the JSON. Examples:
User: "how many open deals do I have?" -> {"tool":"chat","answer":"You have 4 open deals, worth $12,500 in total pipeline value."}
User: "list my leads" -> {"tool":"list_contacts","params":{"type":"lead","search":null}}
User: "create a task to call Ahmed tomorrow" -> {"tool":"create_task","params":{"title":"Call Ahmed","description":null,"due_date":"<tomorrow's date computed from today's date above>","priority":null}}
User: "add a new lead named Sara Khan, sara@acme.com" -> {"tool":"create_contact","params":{"name":"Sara Khan","email":"sara@acme.com","phone":null,"company_name":null,"type":"lead"}}
User: "add a company called Acme Corp" -> {"tool":"create_company","params":{"name":"Acme Corp","website":null,"industry":null,"size":null,"location":null}}
User: "create a company" -> {"tool":"clarify","question":"Sure - what's the company's name?"}
User: "create a project called Website Redesign for Acme Corp" -> {"tool":"create_project","params":{"name":"Website Redesign","company_name":"Acme Corp","description":null,"due_date":null,"status":null}}
User: "create an invoice for Ahmed for $500 due next Friday" -> {"tool":"create_invoice","params":{"contact_name":"Ahmed","amount":500,"description":null,"due_date":"<next Friday's date computed from today's date above>"}}
User: "create a task" -> {"tool":"clarify","question":"Sure - what should the task be called, and does it have a due date?"}

Question: ${question}`;
}

function parseIntent(text: string): RawIntent | null {
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
  if (typeof parsed !== "object" || parsed === null) return null;
  return parsed as RawIntent;
}

type WorkspaceCtx =
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseClient; workspace: CurrentWorkspace; userId: string };

async function requireWorkspace(): Promise<WorkspaceCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return { ok: false, error: "No workspace found for this account." };
  }

  return { ok: true, supabase, workspace, userId: user.id };
}

// Last N turns only, to keep the prompt within a reasonable token budget --
// this is prior conversation, not the current question.
const HISTORY_LIMIT = 20;

// Only returns prior turns when the user has Save Chat History on -- when
// it's off, nothing was ever persisted so there's nothing to load, same as
// the page-load behavior in app/dashboard/assistant/page.tsx.
async function loadConversationHistory(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<GroqMessage[]> {
  const { data: preference } = await supabase
    .from("user_preferences")
    .select("save_ai_history")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<{ save_ai_history: boolean | null }>();

  const saveHistory = preference?.save_ai_history ?? true;
  if (!saveHistory) return [];

  const { data: history } = await supabase
    .from("ai_chat_history")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const rows = (history as { role: "user" | "assistant"; content: string }[] | null) ?? [];
  return rows.reverse().map((row) => ({ role: row.role, content: row.content }));
}

export async function askAssistant(question: string): Promise<AssistantActionResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { error: "Please enter a question." };
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return { error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.` };
  }

  const ctx = await requireWorkspace();
  if (!ctx.ok) return { error: ctx.error };

  // Lazy monthly reset -- persist any rollover to DB now, before both the
  // pre-check below and deductAiCredits()'s RPC later, so neither is working
  // off a stale prior-period counter. `workspace` (not ctx.workspace) is
  // used for the rest of this function so it reflects the reset.
  const resetState = await resetCreditsIfDue(ctx.supabase, ctx.workspace);
  const workspace: CurrentWorkspace = { ...ctx.workspace, ...resetState };

  // Classification (the Groq call below) always costs 1 credit -- checked
  // up front so a workspace at its limit doesn't spend the call at all.
  const creditCheck = requireAiCredits(workspace, "chat");
  if (!creditCheck.ok) {
    return { error: creditCheck.error };
  }

  // Same gates as the dashboard's KPI widgets -- a member who can't see
  // revenue/deals/contacts figures on the dashboard shouldn't see them
  // surface through the assistant's chat responses either.
  const visibility = {
    contacts: hasModuleAccess(
      workspace.role,
      workspace.permissions,
      "dashboard",
      "contacts_kpis",
      workspace.modulePreferences
    ),
    deals: hasModuleAccess(
      workspace.role,
      workspace.permissions,
      "dashboard",
      "deals_kpis",
      workspace.modulePreferences
    ),
    revenue: hasModuleAccess(
      workspace.role,
      workspace.permissions,
      "dashboard",
      "revenue_kpis",
      workspace.modulePreferences
    ),
  };

  const summary = await buildWorkspaceSummary(ctx.supabase, workspace.id, visibility);
  const todayISO = new Date().toISOString().slice(0, 10);
  const prompt = buildIntentPrompt(formatWorkspaceSummary(summary), todayISO, trimmed);

  const history = await loadConversationHistory(ctx.supabase, ctx.userId, workspace.id);
  const messages: GroqMessage[] = [...history, { role: "user", content: prompt }];

  const result = await callGroq(messages, { temperature: 0 }, "json");
  if (result.error || !result.text) {
    return { error: result.error ?? "The AI didn't return a response. Please try again." };
  }

  // Classification succeeded -- 1 credit, regardless of which branch below
  // runs (even if the user goes on to cancel a create-preview). A failed
  // deduction here (e.g. a concurrent request won the race) doesn't block
  // the response the user already paid the Groq round trip for -- it just
  // means no `credits` info is attached.
  const deduction = await deductAiCredits(workspace, "chat", ctx.userId);
  const credits = deduction.ok ? getRemainingCreditsAfter(workspace, "chat") : undefined;

  const intent = parseIntent(result.text);
  if (!intent || !intent.tool) {
    // Fall back to treating the raw text as a direct answer rather than erroring out.
    return { kind: "answer", text: result.text.trim(), credits };
  }

  const params = intent.params ?? {};

  const outcome = await (async (): Promise<AssistantAnswer | AssistantConfirm> => {
    switch (intent.tool) {
      case "chat":
        return { kind: "answer", text: intent.answer?.trim() || "I'm not sure how to answer that." };

      case "clarify":
        return { kind: "answer", text: intent.question?.trim() || "Could you say a bit more about what you need?" };

      case "list_contacts": {
        const text = await runListContacts({
          type: (params.type as ContactType | null) ?? null,
          search: (params.search as string | null) ?? null,
        });
        return { kind: "answer", text, tool: "list_contacts" };
      }

      case "list_deals": {
        const text = await runListDeals(
          ctx.supabase,
          workspace.id,
          { stage: (params.stage as DealStage | null) ?? null },
          visibility.deals
        );
        return { kind: "answer", text, tool: "list_deals" };
      }

      case "upcoming_tasks": {
        const text = await runUpcomingTasks(ctx.supabase, workspace.id);
        return { kind: "answer", text, tool: "upcoming_tasks" };
      }

      case "overdue_invoices": {
        const text = await runOverdueInvoices(ctx.supabase, workspace.id, visibility.revenue);
        return { kind: "answer", text, tool: "overdue_invoices" };
      }

      case "project_progress": {
        const text = await runProjectProgress(ctx.supabase, workspace.id, {
          project_name: (params.project_name as string | null) ?? null,
        });
        return { kind: "answer", text, tool: "project_progress" };
      }

      case "create_contact": {
        const name = String(params.name ?? "").trim();
        if (!name) {
          return { kind: "answer", text: "What should I name the new contact?" };
        }
        const createParams: CreateContactParams = {
          name,
          email: (params.email as string | null) ?? null,
          phone: (params.phone as string | null) ?? null,
          company_name: (params.company_name as string | null) ?? null,
          type: params.type === "customer" ? "customer" : "lead",
        };
        return { kind: "confirm", tool: "create_contact", params: createParams, preview: previewCreateContact(createParams) };
      }

      case "create_task": {
        const title = String(params.title ?? "").trim();
        if (!title) {
          return { kind: "answer", text: "What should the task be called?" };
        }
        const createParams: CreateTaskParams = {
          title,
          description: (params.description as string | null) ?? null,
          due_date: (params.due_date as string | null) ?? null,
          priority: (params.priority as TaskPriority | null) ?? null,
        };
        return { kind: "confirm", tool: "create_task", params: createParams, preview: previewCreateTask(createParams) };
      }

      case "create_deal": {
        const title = String(params.title ?? "").trim();
        if (!title) {
          return { kind: "answer", text: "What should the deal be called?" };
        }
        const contactName = (params.contact_name as string | null) ?? null;
        const contactId = await resolveContactIdByName(ctx.supabase, workspace.id, contactName);
        const valueRaw = params.value;
        const value = typeof valueRaw === "number" ? valueRaw : valueRaw != null ? Number(valueRaw) : null;
        const createParams: CreateDealParams = {
          title,
          value: value != null && !Number.isNaN(value) ? value : null,
          stage: (params.stage as DealStage | null) ?? null,
          contact_id: contactId,
          contact_name: contactName,
        };
        return { kind: "confirm", tool: "create_deal", params: createParams, preview: previewCreateDeal(createParams) };
      }

      case "create_company": {
        const name = String(params.name ?? "").trim();
        if (!name) {
          return { kind: "answer", text: "What should I name the new company?" };
        }
        const createParams: CreateCompanyParams = {
          name,
          website: (params.website as string | null) ?? null,
          industry: (params.industry as CompanyIndustry | null) ?? null,
          size: (params.size as CompanySize | null) ?? null,
          location: (params.location as string | null) ?? null,
        };
        return { kind: "confirm", tool: "create_company", params: createParams, preview: previewCreateCompany(createParams) };
      }

      case "create_project": {
        const name = String(params.name ?? "").trim();
        if (!name) {
          return { kind: "answer", text: "What should the project be called?" };
        }
        const companyName = String(params.company_name ?? "").trim();
        if (!companyName) {
          return { kind: "answer", text: "Which client/company is this project for?" };
        }
        const companyId = await resolveCompanyIdByName(ctx.supabase, workspace.id, companyName);
        if (!companyId) {
          return {
            kind: "answer",
            text: `I couldn't find a company called "${companyName}". Add that company first, or tell me the correct name.`,
          };
        }
        const createParams: CreateProjectParams = {
          name,
          company_id: companyId,
          company_name: companyName,
          description: (params.description as string | null) ?? null,
          due_date: (params.due_date as string | null) ?? null,
          status: (params.status as ProjectStatus | null) ?? null,
        };
        return { kind: "confirm", tool: "create_project", params: createParams, preview: previewCreateProject(createParams) };
      }

      case "create_invoice": {
        const amountRaw = params.amount;
        const amount = typeof amountRaw === "number" ? amountRaw : amountRaw != null ? Number(amountRaw) : NaN;
        if (!Number.isFinite(amount) || amount <= 0) {
          return { kind: "answer", text: "What amount should this invoice be for?" };
        }
        const contactName = (params.contact_name as string | null) ?? null;
        const contactId = await resolveContactIdByName(ctx.supabase, workspace.id, contactName);
        const invoiceNumber = await suggestInvoiceNumber(ctx.supabase, workspace.id);
        const description = String(params.description ?? "").trim() || "Services";
        const createParams: CreateInvoiceParams = {
          invoice_number: invoiceNumber,
          contact_id: contactId,
          contact_name: contactName,
          description,
          amount,
          due_date: (params.due_date as string | null) ?? null,
        };
        return { kind: "confirm", tool: "create_invoice", params: createParams, preview: previewCreateInvoice(createParams) };
      }

      default:
        return { kind: "answer", text: "I'm not sure how to help with that yet. Try asking about your contacts, companies, deals, tasks, invoices, or projects." };
    }
  })();

  return { ...outcome, credits };
}

export async function confirmAssistantAction(
  tool: WriteTool,
  params:
    | CreateContactParams
    | CreateTaskParams
    | CreateDealParams
    | CreateCompanyParams
    | CreateProjectParams
    | CreateInvoiceParams
): Promise<AssistantAnswer | { error: string }> {
  const ctx = await requireWorkspace();
  if (!ctx.ok) return { error: ctx.error };

  const resetState = await resetCreditsIfDue(ctx.supabase, ctx.workspace);
  const workspace: CurrentWorkspace = { ...ctx.workspace, ...resetState };

  // Create-specific cost (2 or 3), separate from and on top of the 1 credit
  // already charged for classification when the preview was generated.
  const creditCheck = requireAiCredits(workspace, tool);
  if (!creditCheck.ok) {
    return { error: creditCheck.error };
  }

  let outcome: ExecuteResult;
  switch (tool) {
    case "create_contact":
      outcome = await executeCreateContact(params as CreateContactParams);
      break;
    case "create_task":
      outcome = await executeCreateTask(params as CreateTaskParams);
      break;
    case "create_deal":
      outcome = await executeCreateDeal(params as CreateDealParams);
      break;
    case "create_company":
      outcome = await executeCreateCompany(params as CreateCompanyParams);
      break;
    case "create_project":
      outcome = await executeCreateProject(params as CreateProjectParams);
      break;
    case "create_invoice":
      outcome = await executeCreateInvoice(params as CreateInvoiceParams);
      break;
    default:
      return { error: "Unknown action." };
  }

  // Only a successful create ever costs credits -- a failed write (bad
  // input, permission error, DB error) returns its message as-is, unmetered.
  if (!outcome.ok) {
    return { kind: "answer", text: outcome.text, tool };
  }

  const deduction = await deductAiCredits(workspace, tool, ctx.userId);
  const credits = deduction.ok ? getRemainingCreditsAfter(workspace, tool) : undefined;

  return { kind: "answer", text: outcome.text, tool, credits };
}
