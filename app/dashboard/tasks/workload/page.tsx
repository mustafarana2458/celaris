import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { WorkloadPageClient } from "@/components/tasks/workload/WorkloadPageClient";
import type { Project, Task, WorkspaceTeamMember } from "@/lib/types";

export default async function WorkloadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: tasks }, { data: projects }, { data: members }] = workspace
    ? await Promise.all([
        supabase
          .from("tasks")
          .select("*, projects(id, name), subtasks(*), assignee:users!assigned_to(id, full_name)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .order("position", { referencedTable: "subtasks", ascending: true }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
      ])
    : [{ data: [] as Task[] }, { data: [] as Project[] }, { data: [] as WorkspaceTeamMember[] }];

  return (
    <WorkloadPageClient
      initialTasks={(tasks as Task[]) ?? []}
      projects={(projects as Pick<Project, "id" | "name">[]) ?? []}
      members={(members as WorkspaceTeamMember[]) ?? []}
      currentUserId={user.id}
    />
  );
}
