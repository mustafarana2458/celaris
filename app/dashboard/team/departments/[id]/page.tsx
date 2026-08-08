import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { DepartmentDetailClient } from "@/components/team/departments/DepartmentDetailClient";
import type { Department, DepartmentMember, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export default async function DepartmentDetailPage({ params }: { params: { id: string } }) {
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
  requireModuleAccess(workspace, "team");

  const [{ data: department }, { data: departmentMembers }, { data: members }, { data: directory }] =
    await Promise.all([
      supabase
        .from("departments")
        .select("*")
        .eq("id", params.id)
        .eq("workspace_id", workspace.id)
        .maybeSingle(),
      supabase
        .from("department_members")
        .select(
          "*, user:users!user_id(id, full_name), team_member:team_members!team_member_id(id, member_name, job_title)"
        )
        .eq("department_id", params.id)
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
      supabase
        .from("team_members")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("member_name", { ascending: true }),
    ]);

  if (!department) {
    notFound();
  }

  const canManage = workspace.role === "owner" || workspace.role === "admin";

  return (
    <DepartmentDetailClient
      department={department as Department}
      initialMembers={(departmentMembers as DepartmentMember[]) ?? []}
      workspaceMembers={(members as WorkspaceTeamMember[]) ?? []}
      directory={(directory as TeamMember[]) ?? []}
      canManage={canManage}
    />
  );
}
