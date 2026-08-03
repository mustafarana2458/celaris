import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrentWorkspace = {
  id: string;
  name: string;
  role: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: string;
};

type MembershipRow = {
  role: string;
  workspaces: { id: string; name: string } | null;
};

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
      .select("role, workspaces(id, name)")
      .eq("user_id", userId)
      .eq("workspace_id", userRow.last_active_workspace_id)
      .maybeSingle<MembershipRow>();

    if (data?.workspaces) {
      return { id: data.workspaces.id, name: data.workspaces.name, role: data.role };
    }
    // Membership on the saved workspace no longer exists (removed from it) --
    // fall through to the default membership below.
  }

  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (!data?.workspaces) return null;

  return {
    id: data.workspaces.id,
    name: data.workspaces.name,
    role: data.role,
  };
}

export async function listUserWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspaceSummary[]> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .eq("user_id", userId);

  return ((data as MembershipRow[] | null) ?? [])
    .filter((row): row is MembershipRow & { workspaces: { id: string; name: string } } => Boolean(row.workspaces))
    .map((row) => ({ id: row.workspaces.id, name: row.workspaces.name, role: row.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
