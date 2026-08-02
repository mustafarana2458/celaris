import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { TasksPageClient } from "@/components/tasks/TasksPageClient";
import type { Project, Task } from "@/lib/types";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: tasks }, { data: projects }] = workspace
    ? await Promise.all([
        supabase
          .from("tasks")
          .select("*, projects(id, name), subtasks(*)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .order("position", { referencedTable: "subtasks", ascending: true }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
      ])
    : [{ data: [] as Task[] }, { data: [] as Project[] }];

  return (
    <TasksPageClient
      initialTasks={(tasks as Task[]) ?? []}
      projects={(projects as Pick<Project, "id" | "name">[]) ?? []}
    />
  );
}
