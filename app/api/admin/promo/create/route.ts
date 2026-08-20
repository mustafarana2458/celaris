import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { logAuditEvent } from "@/lib/auditLog";

// Admin Promo Code wizard: creates a new promo_codes row. Platform-admin
// gated (requireSuperAdmin re-checks server-side -- the app/admin/layout.tsx
// guard covers page renders only, not this separate route invocation).
// All validation happens here rather than trusting a client-built
// reward_payload -- the request body is flat, typed fields; this route
// constructs the actual JSON payload itself, which is also what makes
// rejecting 'discount' here airtight rather than just a hidden option in
// the UI (see PLAN_TIERS below).
//
// Only ai_credits and temp_plan_access are supported -- discount needs
// checkout/gateway integration (a later phase) and is rejected outright,
// matching redeem_promo_code's own "UNSUPPORTED" rejection on the
// redemption side (see app/api/promo/redeem/route.ts).

const PLAN_TIERS = new Set(["solo", "team", "scale"]);
const MAX_CODE_LENGTH = 50; // promo_codes.code is varchar(50)

type CreatePromoBody = {
  code?: unknown;
  description?: unknown;
  reward_type?: unknown;
  credits?: unknown;
  plan?: unknown;
  duration_days?: unknown;
  max_redemptions?: unknown;
  expires_at?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

// Accepts a positive integer from JSON (numbers arrive as `number`, but
// guard against strings/floats/NaN/Infinity from a malformed request).
function asPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: CreatePromoBody;
  try {
    body = (await request.json()) as CreatePromoBody;
  } catch {
    return badRequest("Invalid request body.");
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return badRequest("Enter a code.");
  if (code.length > MAX_CODE_LENGTH) return badRequest(`Code must be ${MAX_CODE_LENGTH} characters or fewer.`);

  const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;

  const rewardType = body.reward_type;
  if (rewardType !== "ai_credits" && rewardType !== "temp_plan_access") {
    // Covers both an unrecognized value AND a deliberate 'discount'
    // request -- discount isn't a validation edge case, it's a scope
    // boundary, so it gets the same rejection as garbage input.
    return badRequest(
      rewardType === "discount"
        ? "Discount codes aren't supported yet -- only AI Credits and Temporary Plan Access."
        : "Choose a reward type: AI Credits or Temporary Plan Access."
    );
  }

  let rewardPayload: { credits: number } | { plan: string; duration_days: number };
  if (rewardType === "ai_credits") {
    const credits = asPositiveInt(body.credits);
    if (credits === null) return badRequest("Enter a positive number of credits.");
    rewardPayload = { credits };
  } else {
    const plan = typeof body.plan === "string" ? body.plan : "";
    if (!PLAN_TIERS.has(plan)) return badRequest("Choose a plan: Solo, Team, or Scale.");
    const durationDays = asPositiveInt(body.duration_days);
    if (durationDays === null) return badRequest("Enter a positive number of days.");
    rewardPayload = { plan, duration_days: durationDays };
  }

  const maxRedemptions = body.max_redemptions === undefined ? 1 : asPositiveInt(body.max_redemptions);
  if (maxRedemptions === null) return badRequest("Max redemptions must be a positive whole number.");

  let expiresAt: string | null = null;
  if (typeof body.expires_at === "string" && body.expires_at.trim()) {
    const parsed = new Date(body.expires_at);
    if (Number.isNaN(parsed.getTime())) return badRequest("Invalid expiry date.");
    expiresAt = parsed.toISOString();
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code,
      description,
      reward_type: rewardType,
      reward_payload: rewardPayload,
      max_redemptions: maxRedemptions,
      is_active: true,
      expires_at: expiresAt,
    })
    .select("id, code, description, reward_type, reward_payload, max_redemptions, current_redemptions, is_active, expires_at, created_at")
    .single();

  if (error) {
    // Postgres unique_violation -- the code (after our uppercase-trim
    // normalization) already exists. Friendly, specific message rather
    // than a raw constraint-name error.
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "That code already exists. Try a different one.", code: "DUPLICATE_CODE" }, { status: 409 });
    }
    console.error("[admin promo create] insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not create the promo code." }, { status: 500 });
  }

  await logAuditEvent({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email ?? null,
    action: "promo_code.create",
    targetType: "promo_code",
    targetId: data.id,
    details: {
      code: data.code,
      reward_type: data.reward_type,
      reward_payload: data.reward_payload,
      max_redemptions: data.max_redemptions,
      expires_at: data.expires_at,
    },
  });

  return NextResponse.json({ ok: true, code: data });
}
