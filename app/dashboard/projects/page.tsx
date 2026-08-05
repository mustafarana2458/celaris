import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ProjectsPageClient } from "@/components/projects/ProjectsPageClient";
import type { Company, Deal, Project, WorkspaceTeamMember } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [projectsRes, companiesRes, dealsRes, membersRes] = workspace
    ? await Promise.all([
        supabase
          .from("projects")
          .select(
            "*, companies!client_id(id, name), deals!deal_id(id, title), lead:users!lead_id(id, full_name), milestones(id, is_done), tasks(id, status)"
          )
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase
          .from("deals")
          .select("id, title")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
      ])
    : [
        { data: [] as Project[], error: null },
        { data: [] as Company[], error: null },
        { data: [] as Deal[], error: null },
        { data: [] as WorkspaceTeamMember[], error: null },
      ];

  const loadError = projectsRes.error?.message ?? null;
  if (projectsRes.error) {
    console.error("[projects/page] failed to load projects:", projectsRes.error);
  }

  return (
    <ProjectsPageClient
      initialProjects={(projectsRes.data as Project[]) ?? []}
      companies={(companiesRes.data as Pick<Company, "id" | "name">[]) ?? []}
      deals={(dealsRes.data as Pick<Deal, "id" | "title">[]) ?? []}
      members={(membersRes.data as WorkspaceTeamMember[]) ?? []}
      loadError={loadError}
    />
  );
}
