import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSessionPage } from "@/lib/adminAuth";
import { getAuthEmail } from "@/lib/adminUsers";
import { getPlanLimit } from "@/lib/aiCreditsCore";
import { WorkspaceDetailClient } from "@/components/admin/workspaces/WorkspaceDetailClient";

export type AdminWorkspaceDetail = {
  id: string;
  name: string;
  plan: string;
  ai_credits_used: number;
  ai_credits_reset_at: string | null;
  ownerEmail: string | null;
  activeSubscriptionProvider: string | null;
  planLimit: number;
};

export default async function AdminWorkspaceDetailPage({ params }: { params: { id: string } }) {
  await requireAdminSessionPage();

  const supabase = createServiceClient();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, name, plan, ai_credits_used, ai_credits_reset_at, owner_id")
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      plan: string | null;
      ai_credits_used: number | null;
      ai_credits_reset_at: string | null;
      owner_id: string | null;
    }>();

  if (error) {
    console.error("[admin workspace detail] fetch failed:", error.message);
  }
  if (!workspace) {
    notFound();
  }

  const [ownerEmail, subscriptionRes] = await Promise.all([
    workspace.owner_id ? getAuthEmail(supabase, workspace.owner_id) : Promise.resolve(null),
    supabase
      .from("subscriptions")
      .select("provider")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .maybeSingle<{ provider: string }>(),
  ]);

  const plan = workspace.plan ?? "free";
  const detail: AdminWorkspaceDetail = {
    id: workspace.id,
    name: workspace.name,
    plan,
    ai_credits_used: workspace.ai_credits_used ?? 0,
    ai_credits_reset_at: workspace.ai_credits_reset_at,
    ownerEmail,
    activeSubscriptionProvider: subscriptionRes.data?.provider ?? null,
    planLimit: getPlanLimit(plan),
  };

  return <WorkspaceDetailClient workspace={detail} />;
}
