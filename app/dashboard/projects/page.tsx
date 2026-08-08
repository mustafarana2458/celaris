import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { ProjectsPageClient } from "@/components/projects/ProjectsPageClient";
import type {
  Company,
  Deal,
  Department,
  Project,
  ProjectTemplateRecord,
  TeamMember,
  WorkspaceTeamMember,
} from "@/lib/types";

const PROJECTS_SELECT =
  "*, companies!client_id(id, name, logo_url), deals!deal_id(id, title), lead:users!lead_id(id, full_name), lead_member:team_members!lead_member_id(id, member_name, job_title), milestones(id, is_done), tasks(id, status)";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "projects");

  const [projectsRes, companiesRes, dealsRes, membersRes, templatesRes, directoryRes, departmentsRes] =
    workspace
      ? await Promise.all([
          supabase
            .from("projects")
            .select(PROJECTS_SELECT)
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
          supabase
            .from("project_templates")
            .select("id, workspace_id, name, description, estimated_duration_days, structure, created_by, created_at, updated_at")
            .eq("workspace_id", workspace.id)
            .order("name", { ascending: true }),
          supabase
            .from("team_members")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("member_name", { ascending: true }),
          supabase
            .from("departments")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("department_name", { ascending: true }),
        ])
      : [
          { data: [] as Project[], error: null },
          { data: [] as Company[], error: null },
          { data: [] as Deal[], error: null },
          { data: [] as WorkspaceTeamMember[], error: null },
          { data: [] as ProjectTemplateRecord[], error: null },
          { data: [] as TeamMember[], error: null },
          { data: [] as Department[], error: null },
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
      directory={(directoryRes.data as TeamMember[]) ?? []}
      departments={(departmentsRes.data as Department[]) ?? []}
      dbTemplates={(templatesRes.data as ProjectTemplateRecord[]) ?? []}
      loadError={loadError}
    />
  );
}
