import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { ForecastsPageClient } from "@/components/deals/forecasts/ForecastsPageClient";
import type { Deal, Pipeline, SalesTarget, WorkspaceTeamMember } from "@/lib/types";

export default async function ForecastsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "deals");

  const [dealsRes, targetsRes, pipelinesRes, membersRes] = workspace
    ? await Promise.all([
        supabase
          .from("deals")
          .select("id, workspace_id, title, pipeline_id, owner_id, value, win_probability, stage, expected_close")
          .eq("workspace_id", workspace.id),
        supabase
          .from("sales_targets")
          .select("*, assignee:users!assigned_to(id, full_name), pipelines!pipeline_id(id, name)")
          .eq("workspace_id", workspace.id)
          .order("period_start", { ascending: true }),
        supabase
          .from("pipelines")
          .select("id, workspace_id, name, is_default, created_at")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: true }),
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
      ])
    : [
        { data: [] as Deal[], error: null },
        { data: [] as SalesTarget[], error: null },
        { data: [] as Pipeline[], error: null },
        { data: [] as WorkspaceTeamMember[], error: null },
      ];

  const loadError = dealsRes.error?.message ?? targetsRes.error?.message ?? null;
  if (dealsRes.error) console.error("[forecasts/page] failed to load deals:", dealsRes.error);
  if (targetsRes.error) console.error("[forecasts/page] failed to load sales_targets:", targetsRes.error);

  return (
    <ForecastsPageClient
      deals={(dealsRes.data as Deal[]) ?? []}
      initialTargets={(targetsRes.data as SalesTarget[]) ?? []}
      pipelines={(pipelinesRes.data as Pipeline[]) ?? []}
      members={(membersRes.data as WorkspaceTeamMember[]) ?? []}
      currentRole={workspace?.role ?? "member"}
      loadError={loadError}
    />
  );
}
