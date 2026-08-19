import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { tierAndIntervalForPlanId } from "@/lib/safepay";
import type { Plan } from "@/lib/aiCreditsCore";

// Phase 3c: turns a *verified* Safepay webhook payload into writes against
// subscriptions + workspaces, via the service-role client (a webhook has no
// user session to authenticate a normal client with). Only called from
// app/api/webhooks/safepay/route.ts, after signature verification -- never
// call this with an unverified payload. Mirrors lib/subscriptionSync.ts's
// shape (parse -> resolve workspace -> route by event -> upsert/grant), but
// Safepay's envelope and status vocabulary differ enough from Lemon
// Squeezy's that the details aren't shared code.

export type SyncResult = { ok: true; skipped?: string } | { ok: false; error: string };

// Events this phase acts on, taken from real captured sandbox payloads.
// "payment.succeeded" (no `subscription.` prefix) is deliberately NOT
// listed -- it's a different, non-subscription-scoped event (carries
// data.tracker, not data.id/data.status) and falls through to the
// `!HANDLED_EVENTS.has()` skip below same as any other event Safepay might
// add later.
const HANDLED_EVENTS = new Set([
  "subscription.created",
  "subscription.payment.succeeded",
  "subscription.canceled",
  "subscription.unpaid",
  "subscription.ended",
]);

// Only a genuinely active, paid subscription grants a plan + fresh credits.
// "incomplete" (pre-payment) and "unpaid" still get their row upserted (so
// a future Billing UI reflects reality) but never touch workspaces.plan.
const GRANTS_ACCESS = "active";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SafepaySubscriptionData = {
  id?: string;
  plan_id?: string;
  customer_email?: string;
  status?: string;
  current_period_end_date?: { seconds?: number; nanos?: number };
  reference?: string;
  metadata?: { reference?: string };
};

function parseEvent(payload: Record<string, unknown>) {
  const data = (payload.data ?? {}) as SafepaySubscriptionData;
  return {
    eventType: typeof payload.type === "string" ? payload.type : "",
    subscriptionId: typeof data.id === "string" ? data.id : "",
    data,
  };
}

// Safepay's own docs don't pin down where a checkout-time `reference` lands
// in a webhook payload, and our only captured payloads so far (dashboard-
// created sandbox subscriptions, not ones started through
// createSafepayCheckoutUrl) carry none at all -- so this checks every
// plausible location defensively rather than assuming one. Caller logs
// `foundAt` so the real location gets confirmed the first time a checkout
// actually created via our own flow shows up in the logs.
function resolveReferenceLocation(
  payload: Record<string, unknown>,
  data: SafepaySubscriptionData
): { reference: string | null; foundAt: string | null } {
  if (typeof data.reference === "string" && data.reference) {
    return { reference: data.reference, foundAt: "data.reference" };
  }
  if (typeof payload.reference === "string" && payload.reference) {
    return { reference: payload.reference, foundAt: "payload.reference (top-level)" };
  }
  if (data.metadata && typeof data.metadata.reference === "string" && data.metadata.reference) {
    return { reference: data.metadata.reference, foundAt: "data.metadata.reference" };
  }
  return { reference: null, foundAt: null };
}

function secondsToIso(ts: { seconds?: number } | undefined): string | null {
  if (!ts || typeof ts.seconds !== "number") return null;
  return new Date(ts.seconds * 1000).toISOString();
}

// Safepay sends status in UPPERCASE (INCOMPLETE, ACTIVE, ...); the
// subscriptions table's convention (set by Lemon Squeezy's rows) is
// lowercase, and idx_subscriptions_one_active_per_workspace is a partial
// unique index keyed on status = 'active' (lowercase, literal) -- an
// uppercase 'ACTIVE' row would silently never dedupe against it. Falls back
// to an event-appropriate default only if Safepay ever omits data.status.
function normalizedStatus(eventType: string, rawStatus: string | undefined): string {
  const lower = (rawStatus ?? "").trim().toLowerCase();
  if (lower) return lower;
  if (eventType === "subscription.created") return "incomplete";
  if (eventType === "subscription.payment.succeeded") return "active";
  if (eventType === "subscription.unpaid") return "unpaid";
  return lower;
}

// Renewal/status-change events might not resend `reference` (unconfirmed --
// mirrors Lemon Squeezy's own behavior in lib/subscriptionSync.ts, where
// only the initial checkout carries custom_data and every later event falls
// back to a DB lookup by subscription id). If this subscription already has
// a row -- written by an earlier subscription.created/payment.succeeded
// event that *did* carry a valid reference -- reuse its workspace_id
// instead of failing a legitimate renewal/cancel event we already know the
// workspace for.
async function resolveWorkspaceId(
  supabase: SupabaseClient,
  validatedReference: string | null,
  subscriptionId: string
): Promise<string | null> {
  if (validatedReference) return validatedReference;

  const { data } = await supabase
    .from("subscriptions")
    .select("workspace_id")
    .eq("safepay_subscription_id", subscriptionId)
    .maybeSingle<{ workspace_id: string }>();

  return data?.workspace_id ?? null;
}

// Grants `tier` with a fresh credit period. Callers must only invoke this
// once per billing period (see the current_period_end diff in
// handleGrantableEvent) -- it is not idempotent on its own.
async function applyPlanToWorkspace(supabase: SupabaseClient, workspaceId: string, tier: Plan): Promise<SyncResult> {
  const { error } = await supabase
    .from("workspaces")
    .update({
      plan: tier,
      ai_credits_used: 0,
      ai_credits_reset_at: new Date().toISOString().slice(0, 10),
    })
    .eq("id", workspaceId);

  if (error) return { ok: false, error: `workspaces plan update failed: ${error.message}` };
  return { ok: true };
}

async function downgradeWorkspaceToFree(supabase: SupabaseClient, workspaceId: string): Promise<SyncResult> {
  const { error } = await supabase.from("workspaces").update({ plan: "free" }).eq("id", workspaceId);
  if (error) return { ok: false, error: `workspaces downgrade failed: ${error.message}` };
  return { ok: true };
}

// Handles subscription.created (INCOMPLETE), subscription.payment.succeeded
// (ACTIVE), and subscription.unpaid (UNPAID) -- every status that isn't a
// terminal cancel/expire -- via a single upsert, same split Lemon Squeezy's
// handleActiveEvent uses. Only grants workspace access when status is
// literally 'active' AND the billing period actually changed.
async function handleGrantableEvent(
  supabase: SupabaseClient,
  workspaceId: string,
  subscriptionId: string,
  tier: Plan,
  planId: string,
  status: string,
  data: SafepaySubscriptionData
): Promise<SyncResult> {
  const periodEnd = secondsToIso(data.current_period_end_date);

  // Idempotency guard: a retried delivery of the same event carries the
  // same current_period_end as what's already stored, so it must not
  // re-grant a fresh credit period. A genuinely new billing period (first
  // payment, renewal) always has a different (or previously absent) period
  // end. Mirrors lib/subscriptionSync.ts's handleActiveEvent exactly.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("safepay_subscription_id", subscriptionId)
    .maybeSingle<{ current_period_end: string | null }>();

  const isNewBillingPeriod = !existing || existing.current_period_end !== periodEnd;

  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      provider: "safepay",
      safepay_subscription_id: subscriptionId,
      safepay_customer_email: data.customer_email ?? null,
      plan_id: planId,
      plan_tier: tier,
      status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "safepay_subscription_id" }
  );

  if (upsertError) return { ok: false, error: `subscriptions upsert failed: ${upsertError.message}` };

  if (status === GRANTS_ACCESS && isNewBillingPeriod) {
    return applyPlanToWorkspace(supabase, workspaceId, tier);
  }

  return { ok: true };
}

async function handleCancelled(supabase: SupabaseClient, subscriptionId: string): Promise<SyncResult> {
  // Deliberately does NOT touch workspaces.plan -- same reasoning as Lemon
  // Squeezy's handleCancelled: access should ride out the period the
  // customer already paid for, ending only when subscription.ended fires.
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("safepay_subscription_id", subscriptionId);

  if (error) return { ok: false, error: `subscriptions update failed: ${error.message}` };
  return { ok: true };
}

async function handleEnded(supabase: SupabaseClient, workspaceId: string, subscriptionId: string): Promise<SyncResult> {
  // Stored as "expired", not "ended" -- reuses Lemon Squeezy's status
  // vocabulary for the terminal state so a shared Billing UI can read one
  // status column across both providers without a provider-specific switch.
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("safepay_subscription_id", subscriptionId);

  if (error) return { ok: false, error: `subscriptions update failed: ${error.message}` };

  // No credits reset here -- the workspace is dropping to free's own
  // (lower) limit; the next lazy monthly rollover handles the counter
  // naturally, no need to force it early. Mirrors handleExpired in
  // lib/subscriptionSync.ts.
  return downgradeWorkspaceToFree(supabase, workspaceId);
}

export async function applySafepaySubscriptionUpdate(payload: unknown): Promise<SyncResult> {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "payload is not an object" };
  }

  const p = payload as Record<string, unknown>;
  const { eventType, subscriptionId, data } = parseEvent(p);

  if (!HANDLED_EVENTS.has(eventType)) {
    return { ok: true, skipped: `unhandled event: ${eventType || "(none)"}` };
  }

  if (!subscriptionId) {
    console.warn(`[safepay sync] event "${eventType}" has no data.id -- skipping.`);
    return { ok: true, skipped: "missing subscription id" };
  }

  const planId = typeof data.plan_id === "string" ? data.plan_id : "";
  const planDetails = tierAndIntervalForPlanId(planId);
  if (!planDetails) {
    console.error(`[safepay sync] unrecognized plan_id "${planId}" for subscription ${subscriptionId} -- skipping.`);
    return { ok: true, skipped: "unrecognized plan_id" };
  }

  const supabase = createServiceClient();

  const { reference: rawReference, foundAt } = resolveReferenceLocation(p, data);
  let validatedReference: string | null = null;
  if (rawReference) {
    if (UUID_RE.test(rawReference)) {
      validatedReference = rawReference;
      console.log(`[safepay sync] reference found at ${foundAt}: "${rawReference}" -- using as workspace_id.`);
    } else {
      console.warn(`[safepay sync] reference found at ${foundAt} is not a UUID ("${rawReference}") -- ignoring, trying DB fallback.`);
    }
  } else {
    console.log(`[safepay sync] no reference present in payload (subscription ${subscriptionId}) -- trying DB fallback by subscription id.`);
  }

  const workspaceId = await resolveWorkspaceId(supabase, validatedReference, subscriptionId);

  if (!workspaceId) {
    console.warn(
      `[safepay webhook] no reference, cannot resolve workspace -- skipping sync (subscription ${subscriptionId}, event "${eventType}").`
    );
    return { ok: true, skipped: "workspace_id could not be resolved" };
  }

  if (eventType === "subscription.canceled") {
    return handleCancelled(supabase, subscriptionId);
  }

  if (eventType === "subscription.ended") {
    return handleEnded(supabase, workspaceId, subscriptionId);
  }

  const status = normalizedStatus(eventType, data.status);
  return handleGrantableEvent(supabase, workspaceId, subscriptionId, planDetails.tier, planId, status, data);
}
