import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import type { WorkspacePermissions, WorkspaceTeamMember } from "@/lib/types";

type MemberPermissionsRow = { user_id: string; permissions: WorkspacePermissions | null };

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "team", "active_members");

  const [{ data: workspaceMembers }, { data: memberPermissions }] = workspace
    ? await Promise.all([
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
        supabase.from("workspace_members").select("user_id, permissions").eq("workspace_id", workspace.id),
      ])
    : [{ data: [] as WorkspaceTeamMember[] }, { data: [] as MemberPermissionsRow[] }];

  const permissionsByUser = new Map(
    ((memberPermissions as MemberPermissionsRow[] | null) ?? []).map((row) => [
      row.user_id,
      row.permissions ?? null,
    ])
  );

  const membersWithPermissions = ((workspaceMembers as WorkspaceTeamMember[] | null) ?? []).map((m) => ({
    ...m,
    permissions: permissionsByUser.get(m.user_id) ?? null,
  }));

  return (
    <TeamPageClient
      workspaceMembers={membersWithPermissions}
      currentUserId={user.id}
      currentUserRole={(workspace?.role as "owner" | "admin" | "member") ?? "member"}
    />
  );
}
