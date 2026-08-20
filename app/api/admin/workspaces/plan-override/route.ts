import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { logAuditEvent } from "@/lib/auditLog";

// Admin Workspaces module: manual plan override -- sets workspaces.plan
// directly, bypassing billing. For VIPs/beta testers, per the boss's
// spec. Does NOT touch subscriptions or any payment gateway -- if the
// workspace has a real active subscription, this override sits on top of
// it independently (the UI warns about this; see
// components/admin/workspaces/PlanOverrideModal.tsx). The next billing
// webhook (renewal, cancellation, upgrade) can still write workspaces.plan
// again later and silently undo this override -- that's expected, not a
// bug to fix here.

const PLAN_VALUES = new Set(["free", "solo", "team", "scale"]);

type PlanOverrideBody = { workspaceId?: unknown; newPlan?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: PlanOverrideBody;
  try {
    body = (await request.json()) as PlanOverrideBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const newPlan = typeof body.newPlan === "string" ? body.newPlan : "";
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Missing workspace id." }, { status: 400 });
  if (!PLAN_VALUES.has(newPlan)) {
    return NextResponse.json({ ok: false, error: "Choose a plan: Free, Solo, Team, or Scale." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("id, plan")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; plan: string | null }>();

  if (fetchError) {
    console.error("[admin workspaces plan-override] fetch failed:", fetchError.message);
    return NextResponse.json({ ok: false, error: "Could not load the workspace." }, { status: 500 });
  }
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Workspace not found." }, { status: 404 });
  }

  const oldPlan = workspace.plan ?? "free";
  if (oldPlan === newPlan) {
    // Nothing actually changes -- no update, no audit entry (there is no
    // old -> new to record).
    return NextResponse.json({ ok: true, noChange: true, plan: oldPlan });
  }

  // Always resets ai_credits_used to 0 (and the reset date to today),
  // regardless of whether this reads as an "upgrade" or "downgrade" --
  // unlike a real billing plan change, an override has no well-defined
  // direction (free -> scale, scale -> free, solo -> team are all just
  // "the admin picked a plan"), so a single consistent rule is clearer
  // than an asymmetric one. This also matches the spirit of the action:
  // if an admin is manually granting a VIP/beta tester a plan, they
  // should get that plan's FULL allowance immediately, not still be
  // capped by whatever they'd already used under the old plan.
  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ plan: newPlan, ai_credits_used: 0, ai_credits_reset_at: new Date().toISOString().slice(0, 10) })
    .eq("id", workspaceId);

  if (updateError) {
    console.error("[admin workspaces plan-override] update failed:", updateError.message);
    return NextResponse.json({ ok: false, error: "Could not update the plan." }, { status: 500 });
  }

  await logAuditEvent({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email ?? null,
    action: "workspace.plan_override",
    targetType: "workspace",
    targetId: workspaceId,
    details: { old_plan: oldPlan, new_plan: newPlan, credits_reset: true },
  });

  return NextResponse.json({ ok: true, noChange: false, plan: newPlan });
}
