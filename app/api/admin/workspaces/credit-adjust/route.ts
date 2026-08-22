import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";

// Admin Workspaces module: manual AI credit adjustment, no gateway
// charge.
//   direction "add"      -- grant more credits: purchased_ai_credits += amount
//     (never-expiring, see sql/phase3_purchased_credits.sql). Previously
//     this did `ai_credits_used = GREATEST(0, ai_credits_used - amount)`,
//     which had the exact same silent-loss bug as redeem_promo_code's
//     ai_credits reward on a low-usage workspace -- see
//     sql/fix_promo_ai_credits.sql for the full writeup. Fixed the same
//     way: grant into purchased_ai_credits instead, which is purely
//     additive and has no floor to hit.
//   direction "subtract" -- claw back headroom: ai_credits_used += amount, no upper cap
//     (an over-limit workspace is already a state the rest of the credit
//     system handles -- it just blocks new AI actions until the next
//     reset, same as organic overuse would). Unchanged -- this direction
//     never had the floor bug (it only ever adds to ai_credits_used).
//
// Plain read-then-write, not an atomic RPC -- this is a low-frequency,
// admin-only action (unlike the redeem_promo_code RPC, which had to be
// atomic against concurrent END-USER redemptions), so the small race
// window against a second concurrent admin edit is an accepted
// simplification here.

type CreditAdjustBody = { workspaceId?: unknown; direction?: unknown; amount?: unknown };

function asPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: CreditAdjustBody;
  try {
    body = (await request.json()) as CreditAdjustBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Missing workspace id." }, { status: 400 });

  const direction = body.direction;
  if (direction !== "add" && direction !== "subtract") {
    return NextResponse.json({ ok: false, error: "Choose Add or Subtract." }, { status: 400 });
  }

  const amount = asPositiveInt(body.amount);
  if (amount === null) return NextResponse.json({ ok: false, error: "Enter a positive number of credits." }, { status: 400 });

  const supabase = createServiceClient();

  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("id, ai_credits_used, purchased_ai_credits")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; ai_credits_used: number | null; purchased_ai_credits: number | null }>();

  if (fetchError) {
    console.error("[admin workspaces credit-adjust] fetch failed:", fetchError.message);
    return NextResponse.json({ ok: false, error: "Could not load the workspace." }, { status: 500 });
  }
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Workspace not found." }, { status: 404 });
  }

  const oldUsed = workspace.ai_credits_used ?? 0;
  const oldPurchased = workspace.purchased_ai_credits ?? 0;

  const newUsed = direction === "add" ? oldUsed : oldUsed + amount;
  const newPurchased = direction === "add" ? oldPurchased + amount : oldPurchased;

  const { error: updateError } = await supabase
    .from("workspaces")
    .update(direction === "add" ? { purchased_ai_credits: newPurchased } : { ai_credits_used: newUsed })
    .eq("id", workspaceId);

  if (updateError) {
    console.error("[admin workspaces credit-adjust] update failed:", updateError.message);
    return NextResponse.json({ ok: false, error: "Could not adjust credits." }, { status: 500 });
  }

  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "workspace.credit_adjust",
    targetType: "workspace",
    targetId: workspaceId,
    details:
      direction === "add"
        ? { old_purchased: oldPurchased, new_purchased: newPurchased, delta: amount, direction, amount }
        : { old_used: oldUsed, new_used: newUsed, delta: amount, direction, amount },
  });

  return NextResponse.json({ ok: true, ai_credits_used: newUsed, purchased_ai_credits: newPurchased });
}
