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

  const [dealsRes, contactsRes, companiesRes, pipelinesRes, membersRes] = workspace
    ? await Promise.all([
        supabase
          .from("deals")
          .select(
            "*, contacts(id, name, company, companies(name)), companies!company_id(id, name), owner:users!owner_id(id, full_name), pipelines!pipeline_id(id, name)"
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
        { data: [] as Deal[], error: null },
        { data: [] as Contact[], error: null },
        { data: [] as Company[], error: null },
        { data: [] as Pipeline[], error: null },
        { data: [] as WorkspaceTeamMember[], error: null },
      ];

  // A failed embed/join here silently turns into an empty deals list with no
  // indication why -- surface it instead of pretending the workspace has 0 deals.
  const loadError = dealsRes.error?.message ?? null;
  if (dealsRes.error) {
    console.error("[deals/page] failed to load deals:", dealsRes.error);
  }

  return (
    <DealsPageClient
      initialDeals={(dealsRes.data as Deal[]) ?? []}
      contacts={(contactsRes.data as Pick<Contact, "id" | "name">[]) ?? []}
      companies={(companiesRes.data as Pick<Company, "id" | "name">[]) ?? []}
      initialPipelines={(pipelinesRes.data as Pipeline[]) ?? []}
      members={(membersRes.data as WorkspaceTeamMember[]) ?? []}
      currentUserId={user.id}
      loadError={loadError}
    />
  );
}
