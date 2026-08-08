import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { TasksPageClient } from "@/components/tasks/TasksPageClient";
import type { Project, Task, TeamMember, WorkspaceTeamMember } from "@/lib/types";

const TASKS_SELECT =
  "*, projects(id, name), subtasks(*), assignee:users!assigned_to(id, full_name), assignee_member:team_members!assigned_to_member_id(id, member_name, job_title)";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "tasks");

  const [{ data: tasks }, { data: projects }, { data: members }, { data: directory }] = workspace
    ? await Promise.all([
        supabase
          .from("tasks")
          .select(TASKS_SELECT)
          .eq("workspace_id", workspace.id)
          .eq("assigned_to", user.id)
          .order("created_at", { ascending: false })
          .order("position", { referencedTable: "subtasks", ascending: true }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
        supabase
          .from("team_members")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("member_name", { ascending: true }),
      ])
    : [
        { data: [] as Task[] },
        { data: [] as Project[] },
        { data: [] as WorkspaceTeamMember[] },
        { data: [] as TeamMember[] },
      ];

  return (
    <TasksPageClient
      initialTasks={(tasks as Task[]) ?? []}
      projects={(projects as Pick<Project, "id" | "name">[]) ?? []}
      members={(members as WorkspaceTeamMember[]) ?? []}
      directory={(directory as TeamMember[]) ?? []}
      currentUserId={user.id}
    />
  );
}
