import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";
import {
  fetchPaymentGatewayEnabledFromDb,
  invalidatePaymentGatewayCache,
  type PaymentGateway,
} from "@/lib/paymentGateways";

// Admin Portal Financials module: payment gateway enable/disable toggle.
// Mirrors app/api/admin/ai-engine/openai-fallback/route.ts's shape exactly
// (same auth guard, same old-vs-new no-op short-circuit, same upsert +
// audit-log + cache-invalidate sequence) -- one route handling both
// gateways via a `gateway` field, rather than two near-identical routes.

const SETTINGS_KEY: Record<PaymentGateway, string> = {
  safepay: "payment_gateway_safepay_enabled",
  lemonsqueezy: "payment_gateway_lemonsqueezy_enabled",
};

type ToggleBody = { gateway?: unknown; enabled?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: ToggleBody;
  try {
    body = (await request.json()) as ToggleBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (body.gateway !== "safepay" && body.gateway !== "lemonsqueezy") {
    return NextResponse.json({ ok: false, error: "Invalid gateway." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "Missing enabled flag." }, { status: 400 });
  }

  const gateway: PaymentGateway = body.gateway;
  const enabled = body.enabled;

  const supabase = createServiceClient();
  const oldEnabled = await fetchPaymentGatewayEnabledFromDb(supabase, gateway);

  if (oldEnabled === enabled) {
    return NextResponse.json({ ok: true, noChange: true, gateway, enabled: oldEnabled });
  }

  // Deliberately NOT setting updated_by -- same as every other app_settings
  // writer in this codebase (see app/api/admin/ai-engine/*/route.ts).
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: SETTINGS_KEY[gateway],
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error(`[admin payments toggle] update failed for ${gateway}:`, error.message);
    return NextResponse.json({ ok: false, error: "Could not update the gateway setting." }, { status: 500 });
  }

  invalidatePaymentGatewayCache(gateway);

  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "payments.gateway_toggle",
    targetType: "platform",
    targetId: null,
    details: { gateway, old: oldEnabled, new: enabled },
  });

  return NextResponse.json({ ok: true, noChange: false, gateway, enabled });
}
