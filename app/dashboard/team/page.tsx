import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import type { Invitation, TeamMember, WorkspacePermissions, WorkspaceTeamMember } from "@/lib/types";

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

  const [{ data: workspaceMembers }, { data: memberPermissions }, { data: invitations }, { data: teamMembers }] =
    workspace
      ? await Promise.all([
          supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
          supabase.from("workspace_members").select("user_id, permissions").eq("workspace_id", workspace.id),
          supabase
            .from("invitations")
            .select("*")
            .eq("workspace_id", workspace.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("team_members")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false }),
        ])
      : [
          { data: [] as WorkspaceTeamMember[] },
          { data: [] as MemberPermissionsRow[] },
          { data: [] as Invitation[] },
          { data: [] as TeamMember[] },
        ];

  const permissionsByUser = new Map(
    ((memberPermissions as MemberPermissionsRow[] | null) ?? []).map((row) => [
      row.user_id,
      row.permissions ?? {},
    ])
  );

  const membersWithPermissions = ((workspaceMembers as WorkspaceTeamMember[] | null) ?? []).map((m) => ({
    ...m,
    permissions: permissionsByUser.get(m.user_id) ?? {},
  }));

  return (
    <TeamPageClient
      workspaceMembers={membersWithPermissions}
      invitations={(invitations as Invitation[]) ?? []}
      currentUserId={user.id}
      currentUserRole={(workspace?.role as "owner" | "admin" | "member") ?? "member"}
      initialTeamMembers={(teamMembers as TeamMember[]) ?? []}
    />
  );
}
