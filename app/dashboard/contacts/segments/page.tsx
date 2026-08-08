import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { listSegmentsWithCounts } from "@/lib/actions/segments";
import { SegmentsPageClient } from "@/components/segments/SegmentsPageClient";
import type { Segment } from "@/lib/segments";
import type { Company, Tag, WorkspaceTeamMember } from "@/lib/types";

export default async function SegmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "contacts");

  const [segmentsResult, { data: companies }, { data: tags }, { data: teamMembers }] = workspace
    ? await Promise.all([
        listSegmentsWithCounts(),
        supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase
          .from("tags")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase.rpc("get_workspace_team", { p_workspace_id: workspace.id }),
      ])
    : [
        { segments: [] as (Segment & { matchCount: number })[] },
        { data: [] as Pick<Company, "id" | "name">[] },
        { data: [] as Pick<Tag, "id" | "name">[] },
        { data: [] as WorkspaceTeamMember[] },
      ];

  return (
    <SegmentsPageClient
      initialSegments={"segments" in segmentsResult ? segmentsResult.segments : []}
      companies={(companies as Pick<Company, "id" | "name">[]) ?? []}
      tags={(tags as Pick<Tag, "id" | "name">[]) ?? []}
      teamMembers={(teamMembers as WorkspaceTeamMember[]) ?? []}
    />
  );
}
