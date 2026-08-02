import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import type { Invitation, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: workspaceMembers }, { data: invitations }, { data: teamMembers }] = workspace
    ? await Promise.all([
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
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
        { data: [] as Invitation[] },
        { data: [] as TeamMember[] },
      ];

  return (
    <TeamPageClient
      workspaceMembers={(workspaceMembers as WorkspaceTeamMember[]) ?? []}
      invitations={(invitations as Invitation[]) ?? []}
      currentUserId={user.id}
      currentUserRole={(workspace?.role as "owner" | "admin" | "member") ?? "member"}
      initialTeamMembers={(teamMembers as TeamMember[]) ?? []}
    />
  );
}
