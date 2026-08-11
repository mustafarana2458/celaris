import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { TeamInvitesPageClient } from "@/components/team/TeamInvitesPageClient";
import type { Invitation } from "@/lib/types";

export default async function TeamInvitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "team", "pending_invites");

  const { data: invitations } = workspace
    ? await supabase
        .from("invitations")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: [] as Invitation[] };

  const canManage = workspace?.role === "owner" || workspace?.role === "admin";

  return (
    <TeamInvitesPageClient invitations={(invitations as Invitation[]) ?? []} canManage={canManage} />
  );
}
