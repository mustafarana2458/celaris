import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { tierForVariant } from "@/lib/lemonSqueezy";
import type { Plan } from "@/lib/aiCreditsCore";

// Phase 3: turns a *verified* Lemon Squeezy webhook payload into writes
// against subscriptions + workspaces, via the service-role client (a
// webhook has no user session to authenticate a normal client with). Only
// called from app/api/webhooks/lemonsqueezy/route.ts, after signature
// verification -- never call this with an unverified payload.

type LemonAttributes = {
  status?: string;
  customer_id?: number | string;
  order_id?: number | string | null;
  variant_id?: number | string;
  renews_at?: string | null;
  ends_at?: string | null;
};

export type SyncResult = { ok: true; skipped?: string } | { ok: false; error: string };

// Events this phase actually acts on. Everything else Lemon Squeezy can
// send (payment_failed, paused, resumed, plan_changed, ...) is out of
// scope for now -- acked without writing anything rather than rejected.
const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_payment_success",
  "subscription_cancelled",
  "subscription_expired",
]);

// Only a genuinely active, paid subscription grants a plan + fresh credits.
// on_trial/past_due/unpaid/paused still get their row upserted (so a future
// Billing UI reflects reality) but never touch workspaces.plan/credits.
const GRANTS_ACCESS = "active";

function parseEvent(payload: Record<string, unknown>) {
  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const attributes = (data.attributes ?? {}) as LemonAttributes;
  const customData = (meta.custom_data ?? {}) as Record<string, unknown>;

  return {
    eventName: typeof meta.event_name === "string" ? meta.event_name : "",
    subscriptionId: typeof data.id === "string" ? data.id : "",
    workspaceIdFromMeta: typeof customData.workspace_id === "string" ? customData.workspace_id : null,
    attributes,
  };
}

// Renewal/status-change events don't carry custom_data -- fall back to
// whichever workspace this subscription id was already tied to from an
// earlier event.
async function resolveWorkspaceId(
  supabase: SupabaseClient,
  workspaceIdFromMeta: string | null,
  subscriptionId: string
): Promise<string | null> {
  if (workspaceIdFromMeta) return workspaceIdFromMeta;

  const { data } = await supabase
    .from("subscriptions")
    .select("workspace_id")
    .eq("lemon_subscription_id", subscriptionId)
    .maybeSingle<{ workspace_id: string }>();

  return data?.workspace_id ?? null;
}

// Grants `tier` with a fresh credit period. Callers must only invoke this
// once per billing period (see the current_period_end diff in
// handleActiveEvent) -- it is not idempotent on its own.
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

async function handleActiveEvent(
  supabase: SupabaseClient,
  workspaceId: string,
  subscriptionId: string,
  attributes: LemonAttributes
): Promise<SyncResult> {
  if (!attributes.customer_id || !attributes.variant_id) {
    console.warn(`[lemonsqueezy sync] subscription ${subscriptionId} payload missing customer_id/variant_id -- skipping.`);
    return { ok: true, skipped: "malformed payload (missing customer_id/variant_id)" };
  }

  const tier = tierForVariant(attributes.variant_id);
  if (!tier) {
    console.error(`[lemonsqueezy sync] unrecognized variant_id ${attributes.variant_id} for subscription ${subscriptionId} -- skipping plan sync.`);
    return { ok: true, skipped: "unrecognized variant_id" };
  }

  const status = attributes.status ?? "active";
  const periodEnd = attributes.renews_at ?? attributes.ends_at ?? null;

  // Idempotency guard: a retried delivery of the same event carries the
  // same current_period_end as what's already stored, so it must not
  // re-grant a fresh credit period. A genuinely new billing period (first
  // purchase, renewal, upgrade) always has a different (or previously
  // absent) period end.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("lemon_subscription_id", subscriptionId)
    .maybeSingle<{ current_period_end: string | null }>();

  const isNewBillingPeriod = !existing || existing.current_period_end !== periodEnd;

  const { error: upsertError } = await supabase.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      lemon_customer_id: String(attributes.customer_id),
      lemon_subscription_id: subscriptionId,
      lemon_order_id: attributes.order_id != null ? String(attributes.order_id) : null,
      plan_tier: tier,
      variant_id: String(attributes.variant_id),
      status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lemon_subscription_id" }
  );

  if (upsertError) {
    return { ok: false, error: `subscriptions upsert failed: ${upsertError.message}` };
  }

  if (status === GRANTS_ACCESS && isNewBillingPeriod) {
    return applyPlanToWorkspace(supabase, workspaceId, tier);
  }

  return { ok: true };
}

async function handleCancelled(supabase: SupabaseClient, subscriptionId: string): Promise<SyncResult> {
  // Deliberately does NOT touch workspaces.plan -- Lemon Squeezy keeps a
  // cancelled subscription's access alive until its current_period_end,
  // then fires subscription_expired. Downgrading here would cut access
  // short on a period the customer already paid for.
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("lemon_subscription_id", subscriptionId);

  if (error) return { ok: false, error: `subscriptions update failed: ${error.message}` };
  return { ok: true };
}

async function handleExpired(supabase: SupabaseClient, workspaceId: string, subscriptionId: string): Promise<SyncResult> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("lemon_subscription_id", subscriptionId);

  if (error) return { ok: false, error: `subscriptions update failed: ${error.message}` };

  // No credits reset here -- the workspace is dropping to free's own
  // (lower) limit; the next lazy monthly rollover handles the counter
  // naturally, no need to force it early.
  return downgradeWorkspaceToFree(supabase, workspaceId);
}

export async function syncSubscriptionEvent(payload: unknown): Promise<SyncResult> {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "payload is not an object" };
  }

  const { eventName, subscriptionId, workspaceIdFromMeta, attributes } = parseEvent(payload as Record<string, unknown>);

  if (!subscriptionId) {
    return { ok: false, error: "missing subscription id" };
  }

  if (!HANDLED_EVENTS.has(eventName)) {
    return { ok: true, skipped: `unhandled event: ${eventName || "(none)"}` };
  }

  const supabase = createServiceClient();
  const workspaceId = await resolveWorkspaceId(supabase, workspaceIdFromMeta, subscriptionId);

  if (!workspaceId) {
    console.warn(
      `[lemonsqueezy sync] could not resolve workspace_id for subscription ${subscriptionId} (event ${eventName}) -- skipping.`
    );
    return { ok: true, skipped: "workspace_id could not be resolved" };
  }

  if (eventName === "subscription_cancelled") {
    return handleCancelled(supabase, subscriptionId);
  }

  if (eventName === "subscription_expired") {
    return handleExpired(supabase, workspaceId, subscriptionId);
  }

  return handleActiveEvent(supabase, workspaceId, subscriptionId, attributes);
}
