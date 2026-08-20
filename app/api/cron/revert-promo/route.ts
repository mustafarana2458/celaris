import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Promo Code Engine Phase 4: reverts temp_plan_access redemptions once
// their grant window (promo_code_redemptions.expires_at) has passed. No
// automatic trigger exists for this yet (Phase 2 only records expires_at,
// it never acts on it) -- this route is meant to be hit on a schedule by
// an external trigger. This is a self-hosted server (Ubuntu/pm2, not
// Vercel), so there's no framework-native cron -- see the phase report for
// the crontab line that's meant to call this on an interval.
//
// Only ai_credits and temp_plan_access redemptions exist (discount is
// rejected before insert -- see redeem_promo_code in Phase 2's SQL), and
// only temp_plan_access ever gets a non-null expires_at (ai_credits sets it
// to NULL). So `expires_at < now()` alone already selects exactly the
// temp-plan population; the reward_type check below is a defensive
// belt-and-suspenders in case a future reward type also sets expires_at,
// not something expected to ever filter anything out today.
//
// No DB-side RPC/transaction here (deliberately app-side, unlike Phase 2's
// redeem_promo_code): each redemption is resolved and reverted
// independently in its own pair of UPDATEs, and re-running this after a
// partial failure is safe --  is_reverted = false is both the selection
// filter AND (via .eq("is_reverted", false) on the final UPDATE) a guard
// against double-processing, so a workspace that already got its plan set
// back just gets the same value written again on retry, which is a no-op.

const REVERT_CANDIDATE_LIMIT = 200;

type RevertCandidateRow = {
  id: string;
  workspace_id: string;
  expires_at: string | null;
  promo_codes: { reward_type: string } | { reward_type: string }[] | null;
};

function rewardTypeOf(row: RevertCandidateRow): string | null {
  const joined = row.promo_codes;
  if (!joined) return null;
  return Array.isArray(joined) ? (joined[0]?.reward_type ?? null) : joined.reward_type;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[revert-promo] CRON_SECRET is not configured.");
    return NextResponse.json({ ok: false, error: "Cron endpoint is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: candidates, error: fetchError } = await supabase
    .from("promo_code_redemptions")
    .select("id, workspace_id, expires_at, promo_codes(reward_type)")
    .eq("is_reverted", false)
    .lt("expires_at", nowIso)
    .limit(REVERT_CANDIDATE_LIMIT);

  if (fetchError) {
    console.error("[revert-promo] failed to fetch candidates:", fetchError.message);
    return NextResponse.json({ ok: false, error: "Could not fetch expired redemptions." }, { status: 500 });
  }

  const targets = ((candidates ?? []) as RevertCandidateRow[]).filter((row) => rewardTypeOf(row) === "temp_plan_access");

  let reverted = 0;
  const failures: { redemptionId: string; workspaceId: string; error: string }[] = [];

  for (const target of targets) {
    try {
      // The trial was layered on top of whatever the workspace already
      // had -- revert to its active paid subscription's tier if one
      // exists, otherwise free. Never blindly set free.
      const { data: activeSub, error: subError } = await supabase
        .from("subscriptions")
        .select("plan_tier")
        .eq("workspace_id", target.workspace_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ plan_tier: string }>();

      if (subError) throw new Error(`subscription lookup failed: ${subError.message}`);

      const revertPlan = activeSub?.plan_tier ?? "free";

      // Deliberately does NOT touch ai_credits_used -- mirrors
      // downgradeWorkspaceToFree in lib/subscriptionSync.ts, the app's
      // existing "plan goes down, credits are left as-is" precedent (only
      // a genuine new paid activation resets credits to 0, per
      // upgradeWorkspaceToPlan in that same file). A workspace that used
      // more than the reverted-to plan's allowance during the trial will
      // read as over-limit until its next scheduled reset, same as any
      // other downgrade already produces in this app today.
      const { error: workspaceError } = await supabase
        .from("workspaces")
        .update({ plan: revertPlan })
        .eq("id", target.workspace_id);

      if (workspaceError) throw new Error(`workspace update failed: ${workspaceError.message}`);

      const { error: redemptionError } = await supabase
        .from("promo_code_redemptions")
        .update({ is_reverted: true })
        .eq("id", target.id)
        .eq("is_reverted", false);

      if (redemptionError) throw new Error(`redemption update failed: ${redemptionError.message}`);

      reverted += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[revert-promo] failed to revert redemption ${target.id} (workspace ${target.workspace_id}):`, message);
      failures.push({ redemptionId: target.id, workspaceId: target.workspace_id, error: message });
    }
  }

  console.log(`[revert-promo] checked=${targets.length} reverted=${reverted} failed=${failures.length}`);

  return NextResponse.json({
    ok: true,
    checked: targets.length,
    reverted,
    failed: failures,
  });
}
