import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { DealsPageClient } from "@/components/deals/DealsPageClient";
import type { Company, Contact, Deal, Pipeline, WorkspaceTeamMember } from "@/lib/types";

export default async function DealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: deals }, { data: contacts }, { data: companies }, { data: pipelines }, { data: members }] =
    workspace
      ? await Promise.all([
          supabase
            .from("deals")
            .select(
              "*, contacts(id, name, company, companies(name)), companies(id, name), owner:users(id, full_name), pipelines(id, name)"
            )
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("contacts")
            .select("id, name")
            .eq("workspace_id", workspace.id)
            .order("name", { ascending: true }),
          supabase
            .from("companies")
            .select("id, name")
            .eq("workspace_id", workspace.id)
            .order("name", { ascending: true }),
          supabase
            .from("pipelines")
            .select("id, workspace_id, name, is_default, created_at")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: true }),
          supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
        ])
      : [
          { data: [] as Deal[] },
          { data: [] as Contact[] },
          { data: [] as Company[] },
          { data: [] as Pipeline[] },
          { data: [] as WorkspaceTeamMember[] },
        ];

  return (
    <DealsPageClient
      initialDeals={(deals as Deal[]) ?? []}
      contacts={(contacts as Pick<Contact, "id" | "name">[]) ?? []}
      companies={(companies as Pick<Company, "id" | "name">[]) ?? []}
      initialPipelines={(pipelines as Pipeline[]) ?? []}
      members={(members as WorkspaceTeamMember[]) ?? []}
      currentUserId={user.id}
    />
  );
}
