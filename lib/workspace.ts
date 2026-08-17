import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModulePreferences, WorkspacePermissions } from "./types";

export type CurrentWorkspace = {
  id: string;
  name: string;
  role: string;
  permissions: WorkspacePermissions | null;
  logoUrl: string | null;
  modulePreferences: ModulePreferences | null;
  // AI credit system (Phase 1 plumbing -- not yet read for enforcement
  // anywhere). plan drives the credit limit (see lib/aiCredits.ts);
  // aiCreditsUsed/aiCreditsResetAt are the raw stored counter -- callers
  // that need the *effective* (reset-aware) used count should go through
  // resolveCreditPeriod()/getRemainingCredits() rather than reading these
  // directly.
  plan: string;
  aiCreditsUsed: number;
  aiCreditsResetAt: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: string;
  logoUrl: string | null;
};

type MembershipRow = {
  role: string;
  permissions: WorkspacePermissions | null;
  workspaces: {
    id: string;
    name: string;
    logo_url: string | null;
    module_preferences: ModulePreferences | null;
    plan: string | null;
    ai_credits_used: number | null;
    ai_credits_reset_at: string | null;
  } | null;
};

const WORKSPACE_COLUMNS =
  "id, name, logo_url, module_preferences, plan, ai_credits_used, ai_credits_reset_at";

// ai_credits_used/ai_credits_reset_at have DB defaults (0 / today) but
// aren't guaranteed NOT NULL, so coalesce defensively rather than let a
// null slip into arithmetic in lib/aiCredits.ts.
function toCurrentWorkspace(role: string, permissions: WorkspacePermissions | null, ws: NonNullable<MembershipRow["workspaces"]>): CurrentWorkspace {
  return {
    id: ws.id,
    name: ws.name,
    role,
    permissions: permissions ?? null,
    logoUrl: ws.logo_url ?? null,
    modulePreferences: ws.module_preferences ?? null,
    plan: ws.plan ?? "free",
    aiCreditsUsed: ws.ai_credits_used ?? 0,
    aiCreditsResetAt: ws.ai_credits_reset_at ?? new Date().toISOString().slice(0, 10),
  };
}

export async function getCurrentWorkspace(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentWorkspace | null> {
  const { data: userRow } = await supabase
    .from("users")
    .select("last_active_workspace_id")
    .eq("id", userId)
    .maybeSingle<{ last_active_workspace_id: string | null }>();

  if (userRow?.last_active_workspace_id) {
    const { data } = await supabase
      .from("workspace_members")
      .select(`role, permissions, workspaces(${WORKSPACE_COLUMNS})`)
      .eq("user_id", userId)
      .eq("workspace_id", userRow.last_active_workspace_id)
      .maybeSingle<MembershipRow>();

    if (data?.workspaces) {
      return toCurrentWorkspace(data.role, data.permissions, data.workspaces);
    }
    // Membership on the saved workspace no longer exists (removed from it) --
    // fall through to the default membership below.
  }

  const { data } = await supabase
    .from("workspace_members")
    .select(`role, permissions, workspaces(${WORKSPACE_COLUMNS})`)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (!data?.workspaces) return null;

  return toCurrentWorkspace(data.role, data.permissions, data.workspaces);
}

export async function listUserWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspaceSummary[]> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, logo_url)")
    .eq("user_id", userId);

  return ((data as MembershipRow[] | null) ?? [])
    .filter(
      (row): row is MembershipRow & { workspaces: { id: string; name: string; logo_url: string | null } } =>
        Boolean(row.workspaces)
    )
    .map((row) => ({
      id: row.workspaces.id,
      name: row.workspaces.name,
      role: row.role,
      logoUrl: row.workspaces.logo_url ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
