import type { CurrentWorkspace } from "@/lib/workspace";

// Pure credit math + constants, deliberately free of any server-only import
// (no @/lib/supabase/server) so client components (sidebar AI Usage widget,
// settings AI Usage tab) can import from here directly without pulling
// Node-only code into the browser bundle. lib/aiCredits.ts re-exports
// everything in this file plus the DB-touching functions
// (resetCreditsIfDue/deductAiCredits) that only server code may call.

// One entry per distinct AI action across the app (see the boss's pricing
// doc, Part 2). Costs not explicitly given in that doc are noted below.
export type AiActionType =
  | "chat"
  | "create_contact"
  | "create_company"
  | "create_deal"
  | "create_project"
  | "create_task"
  | "create_invoice"
  | "draft_email"
  | "summarize_deal"
  | "ai_insights"
  | "task_breakdown"
  | "parse_document"
  // Reserved: "Deep Financial & Revenue Forecasting Report" from the boss's
  // AI Usage UI doc. No such report exists yet anywhere in the app (the
  // Forecasts page is chart/data only, no AI generation call) -- listed here
  // purely so the settings cost-table can show it for reference, same as
  // parse_document above. NOT enforced anywhere (no requireAiCredits/
  // deductAiCredits call uses this type) until that feature is actually built.
  | "forecast_report";

export const CREDIT_COSTS: Record<AiActionType, number> = {
  // General chat/search -- the assistant's intent-classification call, and
  // its read-only list_contacts/list_deals/upcoming_tasks/overdue_invoices/
  // project_progress tools.
  chat: 1,
  create_contact: 2,
  create_company: 2,
  // Not explicitly priced in the boss's cost table -- assumed equal to
  // contact/company (also a "create" action). Flagged for confirmation
  // before this is actually enforced in Phase 2/3.
  create_deal: 2,
  // "Generate project scope"
  create_project: 2,
  // "...tasks" (the assistant's create_task tool, distinct from
  // task_breakdown below)
  create_task: 2,
  // "Create full invoice"
  create_invoice: 3,
  draft_email: 1,
  // "Summarize deal/pipeline"
  summarize_deal: 2,
  ai_insights: 2,
  // AI subtask breakdown (lib/actions/tasks.ts breakdownTask) -- distinct
  // action from create_task above.
  task_breakdown: 2,
  // Reserved: document/image parsing isn't built yet (the chat composer's
  // paperclip button is a disabled "coming soon" stub). Cost is pre-agreed
  // so nothing needs revisiting once that feature ships.
  parse_document: 3,
  // Reserved, see the AiActionType comment above -- not built yet.
  forecast_report: 4,
};

// Human-readable label for each action type, used by the settings AI Usage
// tab's usage-log table ("Action Performed" column) and its cost-reference
// table. The ai_usage_log insert (lib/aiCredits.ts deductAiCredits) only
// stores action_type/cost, no entity name, so this is as specific as the log
// can get -- e.g. "Created New Contact", never "Created New Contact: Sara".
export const AI_ACTION_LABELS: Record<AiActionType, string> = {
  chat: "General Chat / Search",
  create_contact: "Created New Contact",
  create_company: "Created New Company",
  create_deal: "Created New Deal",
  create_project: "Generated Project Scope",
  create_task: "Created New Task",
  create_invoice: "Created & Formatted Invoice",
  draft_email: "Drafted Client Email",
  summarize_deal: "Summarized Deal / Pipeline",
  ai_insights: "Generated AI Insights",
  task_breakdown: "Broke Down Task",
  parse_document: "Parsed Document",
  forecast_report: "Deep Financial Forecasting Report",
};

export type Plan = "solo" | "team" | "scale";

const PLAN_LIMITS: Record<Plan, number> = {
  solo: 500,
  team: 2500,
  scale: 10000,
};

// Any plan value outside the three known tiers (legacy "free" rows, or
// anything unrecognized) falls back to Solo's limit rather than 0, so no
// workspace is silently locked out of the AI Assistant.
const DEFAULT_PLAN_LIMIT = PLAN_LIMITS.solo;

export function getPlanLimit(plan: string | null | undefined): number {
  return plan && plan in PLAN_LIMITS ? PLAN_LIMITS[plan as Plan] : DEFAULT_PLAN_LIMIT;
}

export type CreditPeriodState = {
  effectiveUsed: number;
  resetDue: boolean;
  nextResetAt: string;
};

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

// Pure calculation, no DB access -- given the workspace's stored counter and
// reset date, figures out whether a full billing month has elapsed since the
// period started. Callers that only need the *effective* used count (e.g.
// the pre-check, or a UI balance) can use this without writing anything;
// resetCreditsIfDue() in lib/aiCredits.ts is what actually persists the
// rollover.
export function resolveCreditPeriod(used: number, resetAt: string, now: Date = new Date()): CreditPeriodState {
  const resetDate = new Date(`${resetAt}T00:00:00`);
  const periodEnd = addOneMonth(resetDate);

  if (now < periodEnd) {
    return { effectiveUsed: used, resetDue: false, nextResetAt: resetAt };
  }

  // Restart the period from today rather than walking the calendar forward
  // one month at a time -- simpler, and avoids month-length edge cases
  // (e.g. a Jan 31 anchor has no literal "Feb 31").
  return { effectiveUsed: 0, resetDue: true, nextResetAt: now.toISOString().slice(0, 10) };
}

export type RequireAiCreditsResult = { ok: true } | { ok: false; error: string };

// Phase 2/3: call this right before running an AI action (after
// resetCreditsIfDue() if the caller wants the rollover persisted first --
// see its doc comment). Pure/synchronous: reads only the workspace fields
// already loaded by getCurrentWorkspace(), no extra DB round trip for the
// check itself.
export function requireAiCredits(
  workspace: Pick<CurrentWorkspace, "plan" | "aiCreditsUsed" | "aiCreditsResetAt">,
  actionType: AiActionType
): RequireAiCreditsResult {
  const cost = CREDIT_COSTS[actionType];
  const limit = getPlanLimit(workspace.plan);
  const { effectiveUsed } = resolveCreditPeriod(workspace.aiCreditsUsed, workspace.aiCreditsResetAt);

  if (effectiveUsed + cost > limit) {
    return {
      ok: false,
      error: "You've reached this month's AI credit limit. Upgrade your plan or wait for next month's reset.",
    };
  }
  return { ok: true };
}

// `cost` is only set by getRemainingCreditsAfter() below (the delta an
// action just charged) -- getRemainingCredits() reports a point-in-time
// balance with no associated action, so it leaves `cost` undefined.
export type RemainingCredits = { used: number; limit: number; remaining: number; cost?: number };

// Phase 4 (UI): effective remaining balance for display, accounting for a
// reset that's due but not yet persisted. Read-only, writes nothing.
export function getRemainingCredits(
  workspace: Pick<CurrentWorkspace, "plan" | "aiCreditsUsed" | "aiCreditsResetAt">
): RemainingCredits {
  const limit = getPlanLimit(workspace.plan);
  const { effectiveUsed } = resolveCreditPeriod(workspace.aiCreditsUsed, workspace.aiCreditsResetAt);
  return { used: effectiveUsed, limit, remaining: Math.max(0, limit - effectiveUsed) };
}

// Phase 2/3: pure calculation of the balance *after* deducting actionType's
// cost, for attaching to an action's result once deductAiCredits() has
// actually succeeded with that exact cost (Phase 4 UI: "-2 AI Credits" +
// "480/500 left"). Doesn't re-read the DB -- the caller's `workspace` is
// whatever was loaded/reset at the start of the request, so this reports
// "what your balance should now be" rather than issuing another query.
export function getRemainingCreditsAfter(
  workspace: Pick<CurrentWorkspace, "plan" | "aiCreditsUsed" | "aiCreditsResetAt">,
  actionType: AiActionType
): RemainingCredits {
  const limit = getPlanLimit(workspace.plan);
  const { effectiveUsed } = resolveCreditPeriod(workspace.aiCreditsUsed, workspace.aiCreditsResetAt);
  const used = effectiveUsed + CREDIT_COSTS[actionType];
  return { used, limit, remaining: Math.max(0, limit - used), cost: CREDIT_COSTS[actionType] };
}
