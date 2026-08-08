import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { DealsPageClient } from "@/components/deals/DealsPageClient";
import type { Company, Contact, Deal, Pipeline, PipelineView, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export default async function DealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "deals");

  const [dealsRes, contactsRes, companiesRes, pipelinesRes, membersRes, preferenceRes, directoryRes] = workspace
    ? await Promise.all([
        supabase
          .from("deals")
          .select(
            "*, contacts(id, name, company, email, companies(name)), companies!company_id(id, name), owner:users!owner_id(id, full_name), owner_member:team_members!owner_member_id(id, member_name, job_title), pipelines!pipeline_id(id, name)"
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
        supabase
          .from("user_preferences")
          .select("default_pipeline_view")
          .eq("user_id", user.id)
          .eq("workspace_id", workspace.id)
          .maybeSingle<{ default_pipeline_view: PipelineView }>(),
        supabase
          .from("team_members")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("member_name", { ascending: true }),
      ])
    : [
        { data: [] as Deal[], error: null },
        { data: [] as Contact[], error: null },
        { data: [] as Company[], error: null },
        { data: [] as Pipeline[], error: null },
        { data: [] as WorkspaceTeamMember[], error: null },
        { data: null as { default_pipeline_view: PipelineView } | null, error: null },
        { data: [] as TeamMember[], error: null },
      ];

  // A failed embed/join here silently turns into an empty deals list with no
  // indication why -- surface it instead of pretending the workspace has 0 deals.
  const loadError = dealsRes.error?.message ?? null;
  if (dealsRes.error) {
    console.error("[deals/page] failed to load deals:", dealsRes.error);
  }
  // Non-fatal: falls back to the "kanban" default, same as a first-time user
  // with no saved preference yet -- just logged so a real fetch failure
  // (vs. "no row saved yet") isn't invisible.
  if (preferenceRes.error) {
    console.error("[deals/page] failed to load view preference:", preferenceRes.error);
  }

  return (
    <DealsPageClient
      initialDeals={(dealsRes.data as Deal[]) ?? []}
      contacts={(contactsRes.data as Pick<Contact, "id" | "name">[]) ?? []}
      companies={(companiesRes.data as Pick<Company, "id" | "name">[]) ?? []}
      initialPipelines={(pipelinesRes.data as Pipeline[]) ?? []}
      members={(membersRes.data as WorkspaceTeamMember[]) ?? []}
      directory={(directoryRes.data as TeamMember[]) ?? []}
      currentUserId={user.id}
      initialView={preferenceRes.data?.default_pipeline_view ?? "kanban"}
      loadError={loadError}
    />
  );
}
