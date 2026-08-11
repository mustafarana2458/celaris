import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import type { Company, Deal, Department, Project, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    notFound();
  }
  requireModuleAccess(workspace, "projects", "all_projects");

  const [
    { data: project },
    { data: companies },
    { data: deals },
    { data: members },
    { data: directory },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "*, companies!client_id(id, name), deals!deal_id(id, title), lead:users!lead_id(id, full_name), lead_member:team_members!lead_member_id(id, member_name, job_title), milestones(*), tasks(id, title, status, priority, due_date)"
      )
      .eq("id", params.id)
      .eq("workspace_id", workspace.id)
      .order("position", { referencedTable: "milestones", ascending: true })
      .maybeSingle(),
    supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name", { ascending: true }),
    supabase.from("deals").select("id, title").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
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
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      project={project as Project}
      companies={(companies as Pick<Company, "id" | "name">[]) ?? []}
      deals={(deals as Pick<Deal, "id" | "title">[]) ?? []}
      members={(members as WorkspaceTeamMember[]) ?? []}
      directory={(directory as TeamMember[]) ?? []}
      departments={(departments as Department[]) ?? []}
    />
  );
}
