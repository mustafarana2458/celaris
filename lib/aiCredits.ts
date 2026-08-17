import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CurrentWorkspace } from "@/lib/workspace";

// ---- Phase 2: wired into the Assistant panel only ----
// lib/actions/assistant.ts (askAssistant + confirmAssistantAction) now
// calls into these helpers. The other 4 AI surfaces -- generateInsights,
// generateDealSummary, generateFollowUpDraft, breakdownTask -- still run
// unmetered; that's Phase 3.

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
  | "parse_document";

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
// resetCreditsIfDue() below is what actually persists the rollover.
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
// check itself. NOT called from any AI action yet.
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

// Persists the lazy monthly reset when one is due. Phase 2/3 should call
// this before requireAiCredits()/deductAiCredits() so the deduct_ai_credits
// RPC's own limit check -- which only sees the stored ai_credits_used, not
// the "effective" used count -- isn't working off a stale prior-period
// number. Safe to call even when no reset is due (no-op, returns the
// workspace's current values unchanged). NOT called from any AI action yet.
export async function resetCreditsIfDue(
  supabase: SupabaseClient,
  workspace: Pick<CurrentWorkspace, "id" | "aiCreditsUsed" | "aiCreditsResetAt">
): Promise<Pick<CurrentWorkspace, "aiCreditsUsed" | "aiCreditsResetAt">> {
  const period = resolveCreditPeriod(workspace.aiCreditsUsed, workspace.aiCreditsResetAt);
  if (!period.resetDue) {
    return { aiCreditsUsed: workspace.aiCreditsUsed, aiCreditsResetAt: workspace.aiCreditsResetAt };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ ai_credits_used: 0, ai_credits_reset_at: period.nextResetAt })
    .eq("id", workspace.id);

  if (error) {
    // Reset failing shouldn't crash the AI action -- fall back to the
    // stored (stale) count; deduct_ai_credits' own check is the final guard
    // against actually overspending.
    console.error("[aiCredits] monthly reset failed:", error);
    return { aiCreditsUsed: workspace.aiCreditsUsed, aiCreditsResetAt: workspace.aiCreditsResetAt };
  }

  return { aiCreditsUsed: 0, aiCreditsResetAt: period.nextResetAt };
}

export type DeductAiCreditsResult = { ok: true; cost: number } | { ok: false; error: string };

// Phase 2/3: call after the AI action has actually succeeded (never before
// -- a failed Groq call or failed write shouldn't burn a credit). Atomic via
// the deduct_ai_credits RPC (UPDATE ... WHERE ai_credits_used + cost <=
// limit), so two concurrent requests from the same workspace can't both
// slip past the cap the way a JS-side read-then-write could. Also logs the
// deduction to ai_usage_log for traceability and the chat feedback tag.
// NOT called from any AI action yet.
export async function deductAiCredits(
  workspace: Pick<CurrentWorkspace, "id" | "plan">,
  actionType: AiActionType,
  userId: string
): Promise<DeductAiCreditsResult> {
  const supabase = await createClient();
  const cost = CREDIT_COSTS[actionType];
  const limit = getPlanLimit(workspace.plan);

  const { data, error } = await supabase.rpc("deduct_ai_credits", {
    p_workspace_id: workspace.id,
    p_cost: cost,
    p_limit: limit,
  });

  if (error || data !== true) {
    return { ok: false, error: error?.message ?? "AI credit limit reached." };
  }

  const { error: logError } = await supabase.from("ai_usage_log").insert({
    workspace_id: workspace.id,
    user_id: userId,
    action_type: actionType,
    cost,
  });
  // The counter (deduct_ai_credits' UPDATE) is the source of truth for
  // enforcement and already succeeded -- a failed log insert is only a loss
  // of traceability, not grounds to report the deduction itself as failed.
  if (logError) {
    console.error("[aiCredits] usage log insert failed:", logError);
  }

  return { ok: true, cost };
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
