import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CurrentWorkspace } from "@/lib/workspace";
import { CREDIT_COSTS, getPlanLimit, resolveCreditPeriod, type AiActionType } from "./aiCreditsCore";

// Server-only half of the AI credit system -- the pure math/constants
// (CREDIT_COSTS, getRemainingCredits, etc.) live in lib/aiCreditsCore.ts so
// client components can import them without pulling this file's
// @/lib/supabase/server (Node-only, cookies()) import into the browser
// bundle. Re-exported here so existing server-side callers (lib/actions/*)
// don't need to change their import path.
export * from "./aiCreditsCore";

// ---- Phase 2: wired into the Assistant panel only ----
// lib/actions/assistant.ts (askAssistant + confirmAssistantAction) now
// calls into these helpers. The other 4 AI surfaces -- generateInsights,
// generateDealSummary, generateFollowUpDraft, breakdownTask -- still run
// unmetered; that's Phase 3.

// Persists the lazy monthly reset when one is due. Phase 2/3 should call
// this before requireAiCredits()/deductAiCredits() so the deduct_ai_credits
// RPC's own limit check -- which only sees the stored ai_credits_used, not
// the "effective" used count -- isn't working off a stale prior-period
// number. Safe to call even when no reset is due (no-op, returns the
// workspace's current values unchanged).
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
