import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/aiCreditsCore";
import type { CurrentWorkspace } from "@/lib/workspace";

// Celaris Improvements Phase 2B: plan-tier feature/seat enforcement.
// Single source of truth for "what does this plan tier allow" -- both the
// Sidebar's padlock UI and every server action's hard-lock check import
// from here, so the two can never drift apart. Deliberately separate from
// lib/permissions.ts's role-based system (owner/admin/member grants) --
// that answers "can THIS PERSON use a module their workspace already has
// access to"; this answers "does the WORKSPACE'S PLAN include this module
// at all". A Solo workspace's owner has full permissions and is still
// locked out of Projects/Team, because the plan itself doesn't include
// them -- the two systems are orthogonal, both must pass.
//
// moduleKey values match components/dashboard/nav-links.ts's moduleKey
// vocabulary exactly (dashboard/contacts/deals/projects/tasks/invoices/
// team/ai_assistant/settings) -- reusing that taxonomy rather than
// inventing a parallel one.

// workspaces.plan can also be "free" (the legacy/no-subscription default
// every workspace is created with -- see lib/actions/auth.ts) or, in
// principle, any unrecognized string. Phase 2A's billing gate already
// redirects a "free" workspace away from every /dashboard/* route before
// it ever reaches here -- but that gate explicitly exempts Server Action
// requests (the "next-action" header check, so an already-open tab's
// sign-out button keeps working after a workspace becomes gated), which
// means a "free" workspace's server actions are NOT blocked by Phase 2A.
// Treating "free" (and anything unrecognized) as at least as restrictive
// as the cheapest paid tier here is what keeps that gap fail-closed
// rather than fail-open.
export type PlanTier = Plan | "free";

export function normalizePlanTier(plan: string | null | undefined): PlanTier {
  if (plan === "solo" || plan === "team" || plan === "scale") return plan;
  return "free";
}

// Per the boss's spec: Solo locks Projects and Team. Team and Scale are
// fully unlocked -- no additional module locks were specified for them,
// so none are invented here. "free" mirrors solo's restrictions (the
// most restrictive REAL tier) rather than being given its own separate,
// harsher list -- see the PlanTier comment above for why.
const LOCKED_MODULES_BY_PLAN: Record<PlanTier, readonly string[]> = {
  free: ["projects", "team"],
  solo: ["projects", "team"],
  team: [],
  scale: [],
};

export function isModuleLockedByPlan(plan: string | null | undefined, moduleKey: string): boolean {
  return LOCKED_MODULES_BY_PLAN[normalizePlanTier(plan)].includes(moduleKey);
}

// Celaris Improvements Phase 4: read-only accessor for the same
// LOCKED_MODULES_BY_PLAN map above, so the AI assistant's system prompt
// (lib/actions/assistant.ts buildIntentPrompt) can tell the model which
// modules the active workspace's plan restricts -- without a second,
// separately-maintained list that could drift from the real backend gate.
export function getLockedModulesForPlan(plan: string | null | undefined): readonly string[] {
  return LOCKED_MODULES_BY_PLAN[normalizePlanTier(plan)];
}

// Server-side gate for every action inside a plan-locked module (Projects:
// lib/actions/{projects,milestones,projectTemplates}.ts; Team:
// lib/actions/{team,team-invites,departments}.ts). Mirrors
// lib/permissions.ts's requireFullAccess() shape exactly ({error}|null,
// called right after requireWorkspace()) so every call site is a
// one-line, mechanical addition. Fail-closed by construction -- there is
// no code path here that returns null without an explicit "this plan
// allows it" match.
export function requirePlanAllowsModule(
  workspace: Pick<CurrentWorkspace, "plan">,
  moduleKey: string
): { error: string } | null {
  if (isModuleLockedByPlan(workspace.plan, moduleKey)) {
    return { error: "This feature isn't available on your current plan. Upgrade to unlock it." };
  }
  return null;
}

// Seat/workspace numeric limits -- confirmed pricing (Phase 2B
// correction). A key absent from either map means "no cap enforced by
// this file" (currently only scale's member count, which is genuinely
// unlimited per the confirmed pricing, not an unstated gap).
const MEMBER_SEAT_LIMIT_BY_PLAN: Partial<Record<PlanTier, number>> = {
  free: 1,
  solo: 1,
  team: 5,
  // scale: unlimited -- deliberately no entry.
};

const WORKSPACE_LIMIT_BY_PLAN: Partial<Record<PlanTier, number>> = {
  free: 1,
  solo: 1,
  team: 1,
  scale: 3,
};

// Called before creating a new invitation (and defensively again right
// before accept_invitation() runs, in case the workspace's plan changed
// in between) -- counts real workspace_members rows, not the "ghost"
// team_members directory (see sql/2b_access_restriction_rls.sql's
// comment: those aren't real logins and are irrelevant to a seat count).
// Fail-closed: a count query error blocks the add rather than allowing
// it through unverified.
export async function requireMemberSeatAvailable(
  supabase: SupabaseClient,
  workspace: Pick<CurrentWorkspace, "id" | "plan">
): Promise<{ error: string } | null> {
  const limit = MEMBER_SEAT_LIMIT_BY_PLAN[normalizePlanTier(workspace.plan)];
  if (limit === undefined) return null;

  const { count, error } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  if (error) return { error: "Could not verify your plan's member limit. Try again." };
  if ((count ?? 0) >= limit) {
    return { error: `Your plan is limited to ${limit} member${limit === 1 ? "" : "s"}. Upgrade to add more.` };
  }
  return null;
}

// Called before creating an additional workspace -- counts workspaces
// owned by this user, gated by the CURRENT (acting) workspace's plan.
export async function requireWorkspaceSlotAvailable(
  supabase: SupabaseClient,
  currentWorkspacePlan: string | null | undefined,
  ownerId: string
): Promise<{ error: string } | null> {
  const limit = WORKSPACE_LIMIT_BY_PLAN[normalizePlanTier(currentWorkspacePlan)];
  if (limit === undefined) return null;

  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if (error) return { error: "Could not verify your plan's workspace limit. Try again." };
  if ((count ?? 0) >= limit) {
    return { error: `Your plan is limited to ${limit} workspace${limit === 1 ? "" : "s"}. Upgrade to create more.` };
  }
  return null;
}
