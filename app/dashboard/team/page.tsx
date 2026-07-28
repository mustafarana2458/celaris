import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { TeamPageClient } from "@/components/team/TeamPageClient";
import type { TeamMember, WorkspaceMemberRow } from "@/lib/types";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: workspaceMembers }, { data: teamMembers }] = workspace
    ? await Promise.all([
        supabase
          .from("workspace_members")
          .select("user_id, role, users(id, full_name)")
          .eq("workspace_id", workspace.id),
        supabase
          .from("team_members")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] as WorkspaceMemberRow[] }, { data: [] as TeamMember[] }];

  return (
    <TeamPageClient
      workspaceMembers={(workspaceMembers as unknown as WorkspaceMemberRow[]) ?? []}
      currentUserId={user.id}
      initialTeamMembers={(teamMembers as TeamMember[]) ?? []}
    />
  );
}
