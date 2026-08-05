import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { TemplatesPageClient } from "@/components/projects/templates/TemplatesPageClient";
import type { ProjectTemplateRecord } from "@/lib/types";

export default async function ProjectTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const { data: templates, error } = workspace
    ? await supabase
        .from("project_templates")
        .select("id, workspace_id, name, description, estimated_duration_days, structure, created_by, created_at, updated_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
    : { data: [] as ProjectTemplateRecord[], error: null };

  if (error) {
    console.error("[projects/templates/page] failed to load templates:", error);
  }

  return (
    <TemplatesPageClient
      initialTemplates={(templates as ProjectTemplateRecord[]) ?? []}
      loadError={error?.message ?? null}
    />
  );
}
