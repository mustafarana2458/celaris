import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { DepartmentDetailClient } from "@/components/team/departments/DepartmentDetailClient";
import type { Department, DepartmentMember, TeamMember, WorkspaceTeamMember } from "@/lib/types";

type DepartmentMemberRow = {
  id: string;
  department_id: string;
  workspace_id: string;
  user_id: string | null;
  team_member_id: string | null;
  created_at: string;
};

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

  const [{ data: department }, { data: departmentMemberRows, error: membersError }, { data: members }, { data: directory }] =
    await Promise.all([
      supabase
        .from("departments")
        .select("*")
        .eq("id", params.id)
        .eq("workspace_id", workspace.id)
        .maybeSingle(),
      // Plain select, no nested embed -- resolved against `members`/
      // `directory` below in JS instead of a `users!user_id`/
      // `team_members!team_member_id` join, which was silently coming back
      // empty for this brand-new table (relationship-hint/schema-cache
      // quirk) and made every row's name resolve to nothing.
      supabase
        .from("department_members")
        .select("*")
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

  if (membersError) {
    console.error("[department detail] failed to load department_members:", membersError);
  }

  const workspaceMembers = (members as WorkspaceTeamMember[]) ?? [];
  const teamDirectory = (directory as TeamMember[]) ?? [];
  const usersById = new Map(workspaceMembers.map((m) => [m.user_id, m]));
  const teamMembersById = new Map(teamDirectory.map((d) => [d.id, d]));

  const initialMembers: DepartmentMember[] = ((departmentMemberRows as DepartmentMemberRow[] | null) ?? []).map(
    (row) => {
      const activeUser = row.user_id ? usersById.get(row.user_id) : null;
      const ghostMember = row.team_member_id ? teamMembersById.get(row.team_member_id) : null;
      return {
        ...row,
        user: activeUser
          ? { id: activeUser.user_id, full_name: activeUser.full_name ?? activeUser.email ?? "Unnamed" }
          : null,
        team_member: ghostMember
          ? { id: ghostMember.id, member_name: ghostMember.member_name, job_title: ghostMember.job_title }
          : null,
      };
    }
  );

  const canManage = workspace.role === "owner" || workspace.role === "admin";

  return (
    <DepartmentDetailClient
      department={department as Department}
      initialMembers={initialMembers}
      workspaceMembers={workspaceMembers}
      directory={teamDirectory}
      canManage={canManage}
    />
  );
}
