import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ProjectsPageClient } from "@/components/projects/ProjectsPageClient";
import type { Project } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const { data: projects } = workspace
    ? await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
    : { data: [] as Project[] };

  return <ProjectsPageClient initialProjects={(projects as Project[]) ?? []} />;
}
