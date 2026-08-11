import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { MilestonesTimelineClient } from "@/components/projects/timeline/MilestonesTimelineClient";
import type { Milestone, Project, WorkspaceTeamMember } from "@/lib/types";

export default async function MilestonesTimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "projects", "milestones");

  const [projectsRes, milestonesRes, membersRes] = workspace
    ? await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .neq("status", "completed")
          .order("name", { ascending: true }),
        supabase
          .from("milestones")
          .select("*, projects!project_id(id, name, status), owner:users!owner_id(id, full_name)")
          .eq("workspace_id", workspace.id)
          .order("due_date", { ascending: true }),
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
      ])
    : [
        { data: [] as Pick<Project, "id" | "name">[], error: null },
        { data: [] as Milestone[], error: null },
        { data: [] as WorkspaceTeamMember[], error: null },
      ];

  const loadError = projectsRes.error?.message ?? milestonesRes.error?.message ?? null;
  if (projectsRes.error) console.error("[projects/milestones/page] failed to load projects:", projectsRes.error);
  if (milestonesRes.error) console.error("[projects/milestones/page] failed to load milestones:", milestonesRes.error);

  // Milestones are fetched workspace-wide (not per-project) then filtered to
  // non-completed projects here, since a project's own status can change
  // without the milestone row itself changing.
  const activeProjectIds = new Set((projectsRes.data as Pick<Project, "id" | "name">[] | null ?? []).map((p) => p.id));
  const milestones = ((milestonesRes.data as Milestone[] | null) ?? []).filter((m) =>
    activeProjectIds.has(m.project_id)
  );

  return (
    <MilestonesTimelineClient
      projects={(projectsRes.data as Pick<Project, "id" | "name">[]) ?? []}
      milestones={milestones}
      members={(membersRes.data as WorkspaceTeamMember[]) ?? []}
      loadError={loadError}
    />
  );
}
