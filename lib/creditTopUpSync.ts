import { createServiceClient } from "@/lib/supabase/service";
import { isValidTopUpAmount } from "@/lib/aiCreditsCore";

// Celaris Improvements Phase 3: turns a *verified* one-time AI credit
// top-up webhook event into a call to grant_purchased_ai_credits()
// (sql/phase3_purchased_credits.sql), via the service-role client (a
// webhook has no user session). Mirrors lib/subscriptionSync.ts /
// lib/safepaySubscriptionSync.ts's shape (parse -> resolve workspace ->
// grant) but is deliberately a separate module rather than added to
// either of those -- a one-time purchase isn't a subscription event and
// doesn't share their idempotency mechanism (period-end diffing), so
// forcing it into the same file would blur two genuinely different
// event categories rather than reuse real shared logic.

export type SyncResult = { ok: true; skipped?: string } | { ok: false; error: string };

// ---- Lemon Squeezy ----
//
// order_created also fires for a brand-new SUBSCRIPTION's first payment
// (LS fires both order_created and subscription_created for that case),
// so this is NOT simply "any order_created event" -- it only acts when
// meta.custom_data.kind === "ai_credit_topup", the marker
// lib/actions/aiCreditsTopUp.ts's createLemonSqueezyTopUpCheckout()
// embeds at checkout-creation time. Anything else (including a
// plan-tier's first-payment order) is left alone -- lib/subscriptionSync.ts
// already owns that via the subscription_created event on the same order.
export async function syncLemonSqueezyCreditTopUp(payload: unknown): Promise<SyncResult> {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "payload is not an object" };
  }

  const p = payload as Record<string, unknown>;
  const meta = (p.meta ?? {}) as Record<string, unknown>;
  const data = (p.data ?? {}) as Record<string, unknown>;
  const attributes = (data.attributes ?? {}) as Record<string, unknown>;
  const customData = (meta.custom_data ?? {}) as Record<string, unknown>;

  const eventName = typeof meta.event_name === "string" ? meta.event_name : "";
  if (eventName !== "order_created") {
    return { ok: true, skipped: `unhandled event: ${eventName || "(none)"}` };
  }

  if (customData.kind !== "ai_credit_topup") {
    return { ok: true, skipped: "order_created is not an ai_credit_topup (likely a subscription's first payment)" };
  }

  const orderId = typeof data.id === "string" ? data.id : "";
  if (!orderId) {
    console.warn("[lemonsqueezy topup sync] order_created event has no data.id -- skipping.");
    return { ok: true, skipped: "missing order id" };
  }

  const workspaceId = typeof customData.workspace_id === "string" ? customData.workspace_id : null;
  if (!workspaceId) {
    console.error(`[lemonsqueezy topup sync] order ${orderId} missing custom_data.workspace_id -- skipping.`);
    return { ok: true, skipped: "missing workspace_id" };
  }

  const creditsRaw = customData.credits;
  const credits = typeof creditsRaw === "string" ? Number(creditsRaw) : typeof creditsRaw === "number" ? creditsRaw : NaN;
  if (!isValidTopUpAmount(credits)) {
    console.error(`[lemonsqueezy topup sync] order ${orderId} has invalid/missing credits ("${String(creditsRaw)}") -- skipping.`);
    return { ok: true, skipped: "invalid credits value" };
  }

  // total is LS's own string-formatted decimal (e.g. "5.00"); status
  // field name per LS's Order resource -- refunded/partial_refund orders
  // should not grant credits. attributes.status may be absent on some
  // payload variants, in which case this defaults to proceeding (an
  // order_created event is the success signal itself; the refund case is
  // a later, separate event this handler doesn't currently listen for).
  const status = typeof attributes.status === "string" ? attributes.status : null;
  if (status === "refunded" || status === "partial_refund") {
    return { ok: true, skipped: `order status is ${status}, not granting credits` };
  }

  const totalCents = typeof attributes.total === "number" ? attributes.total : null;

  const supabase = createServiceClient();
  const { data: granted, error } = await supabase.rpc("grant_purchased_ai_credits", {
    p_workspace_id: workspaceId,
    p_provider: "lemonsqueezy",
    p_provider_reference: orderId,
    p_credits: credits,
    p_amount_cents: totalCents,
  });

  if (error) {
    return { ok: false, error: `grant_purchased_ai_credits failed: ${error.message}` };
  }
  if (granted !== true) {
    // Already processed by an earlier delivery of the same order_created
    // event -- exactly the idempotency guarantee this is meant to give.
    return { ok: true, skipped: "already granted (idempotent replay)" };
  }

  return { ok: true };
}

// ---- Safepay ----
//
// See lib/actions/aiCreditsTopUp.ts's createSafepayTopUpCheckout for the
// two open, unverified gaps (currency/amount unit, and workspace
// resolution) this whole path depends on. This function is written
// defensively for when those are resolved, but as of this phase it will
// realistically always hit the "cannot resolve workspace" skip path below
// -- logged loudly rather than silently, so it's visible in server logs
// once Safepay is actually live and a real payment.succeeded event
// arrives, instead of failing invisibly.
export async function syncSafepayCreditTopUp(payload: unknown): Promise<SyncResult> {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "payload is not an object" };
  }

  const p = payload as Record<string, unknown>;
  const eventType = typeof p.type === "string" ? p.type : "";

  // "payment.succeeded" (no "subscription." prefix) -- the non-
  // subscription-scoped, tracker-based event lib/safepaySubscriptionSync.ts
  // deliberately does not handle. See that file's HANDLED_EVENTS comment.
  if (eventType !== "payment.succeeded") {
    return { ok: true, skipped: `unhandled event: ${eventType || "(none)"}` };
  }

  const data = (p.data ?? {}) as Record<string, unknown>;
  const tracker = typeof data.tracker === "string" ? data.tracker : null;

  if (!tracker) {
    console.warn("[safepay topup sync] payment.succeeded event has no data.tracker -- skipping.");
    return { ok: true, skipped: "missing tracker" };
  }

  // OPEN GAP (see lib/actions/aiCreditsTopUp.ts): nothing currently
  // persists a workspace_id/credits mapping keyed by tracker at
  // checkout-creation time, so there is no way yet to resolve which
  // workspace this payment belongs to or how many credits were bought.
  // Logged loudly (not silently skipped) so this is impossible to miss
  // once a real payment actually lands here.
  console.error(
    `[safepay topup sync] payment.succeeded received (tracker=${tracker}) but workspace/credits cannot be resolved yet -- ` +
      "this is a known, flagged gap (see lib/actions/aiCreditsTopUp.ts's createSafepayTopUpCheckout OPEN GAP 2). No credits granted."
  );
  return { ok: true, skipped: "workspace resolution not yet implemented for Safepay top-ups" };
}
