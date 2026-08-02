import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import type { Project } from "@/lib/types";

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

  const { data: project } = await supabase
    .from("projects")
    .select("*, milestones(*), tasks(id, title, status, priority, due_date)")
    .eq("id", params.id)
    .eq("workspace_id", workspace.id)
    .order("position", { referencedTable: "milestones", ascending: true })
    .maybeSingle();

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project as Project} />;
}
