import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentWorkspace } from "@/lib/workspace";

// Promo Code Engine Phase 2: redemption endpoint for the ai_credits and
// temp_plan_access reward types (discount is rejected -- that needs
// checkout/gateway integration, a later phase). All validation and the
// reward application itself happen inside the redeem_promo_code Postgres
// function (run manually against the DB -- see the phase report), called
// here via the service-role client since promo_codes/promo_code_redemptions
// are service-role-only for writes, mirroring the subscriptions pattern
// (see lib/subscriptionSync.ts / lib/safepaySubscriptionSync.ts). The
// route itself only resolves who's asking and translates the RPC's
// "CODE: message" errors into structured JSON.

export type RedeemPromoErrorCode = "INVALID" | "EXPIRED" | "ALREADY_REDEEMED" | "CAP_REACHED" | "UNSUPPORTED";

const ERROR_STATUS: Record<RedeemPromoErrorCode, number> = {
  INVALID: 400,
  EXPIRED: 400,
  ALREADY_REDEEMED: 409,
  CAP_REACHED: 409,
  UNSUPPORTED: 422,
};

const KNOWN_ERROR_CODES = new Set<RedeemPromoErrorCode>(["INVALID", "EXPIRED", "ALREADY_REDEEMED", "CAP_REACHED", "UNSUPPORTED"]);

function errorResponse(code: RedeemPromoErrorCode, message: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status: ERROR_STATUS[code] });
}

// redeem_promo_code raises errors as `RAISE EXCEPTION 'CODE: message'` so
// this route can hand back the right HTTP status/error code without the
// RPC needing to return a tagged-union result type.
function parseRpcError(message: string | undefined): { code: RedeemPromoErrorCode; message: string } {
  const match = /^([A-Z_]+):\s*(.*)$/.exec(message ?? "");
  const rawCode = match?.[1];
  const code = rawCode && KNOWN_ERROR_CODES.has(rawCode as RedeemPromoErrorCode) ? (rawCode as RedeemPromoErrorCode) : "INVALID";
  return { code, message: match?.[2] || "Could not redeem this promo code." };
}

type RedeemPromoCodeResult = {
  reward_type: string;
  reward_payload: Record<string, unknown>;
  redemption_expires_at: string | null;
  workspace: { plan: string; ai_credits_used: number };
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return errorResponse("INVALID", "No workspace found.");
  }

  // Same owner/admin gate as the other billing-affecting actions
  // (lib/actions/billing.ts createCheckoutUrl/createSafepayCheckoutUrl) --
  // redemption can change the workspace's plan and AI credit usage, which
  // is a billing-level change, not something every member should trigger.
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Only workspace owners/admins can redeem promo codes." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID", "Invalid request body.");
  }

  const rawCode = body && typeof body === "object" && "code" in body ? (body as { code: unknown }).code : undefined;
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!code) {
    return errorResponse("INVALID", "Enter a promo code.");
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc("redeem_promo_code", {
    p_code: code,
    p_workspace_id: workspace.id,
    p_user_id: user.id,
  });

  if (error) {
    const { code: errorCode, message } = parseRpcError(error.message);
    console.error("[promo redeem] redeem_promo_code failed:", error.message);
    return errorResponse(errorCode, message);
  }

  const result = data as RedeemPromoCodeResult | null;
  if (!result) {
    console.error("[promo redeem] redeem_promo_code returned no data");
    return errorResponse("INVALID", "Could not redeem this promo code.");
  }

  return NextResponse.json({
    ok: true,
    reward: {
      type: result.reward_type,
      payload: result.reward_payload,
      expiresAt: result.redemption_expires_at,
    },
    workspace: {
      plan: result.workspace.plan,
      ai_credits_used: result.workspace.ai_credits_used,
    },
  });
}
