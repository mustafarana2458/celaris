import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrentWorkspace = {
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
