import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { TeamDirectoryPageClient } from "@/components/team/TeamDirectoryPageClient";
import type { TeamMember } from "@/lib/types";

export default async function TeamDirectoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "team", "team_directory");

  const { data: teamMembers } = workspace
    ? await supabase
        .from("team_members")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
    : { data: [] as TeamMember[] };

  return <TeamDirectoryPageClient initialTeamMembers={(teamMembers as TeamMember[]) ?? []} />;
}
