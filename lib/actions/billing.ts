"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { variantForTier, type BillingInterval } from "@/lib/lemonSqueezy";
import { getSafepayClient, planIdForTier } from "@/lib/safepay";
import type { Plan } from "@/lib/aiCreditsCore";

export type CreateCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

// Phase 4: builds a Lemon Squeezy hosted checkout URL for the caller's
// current workspace, embedding workspace_id in checkout_data.custom so
// Phase 3's webhook handler (lib/subscriptionSync.ts) can resolve which
// workspace to sync without falling back to a prior-row lookup. Called
// from both the Dev Panel's test-checkout section (lib/actions/devPanel.ts)
// and, since Phase 5, BillingTab's real upgrade/switch buttons.
export async function createCheckoutUrl(tier: Plan, interval: BillingInterval): Promise<CreateCheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) return { ok: false, error: "No workspace found." };

  // Same role gate as other workspace-level billing/settings actions (see
  // lib/actions/devPanel.ts setWorkspacePlan) -- only owners/admins should
  // be able to start a checkout for the workspace.
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return { ok: false, error: "Only workspace owners/admins can manage billing." };
  }

  const variantId = variantForTier(tier, interval);
  if (!variantId) {
    return { ok: false, error: `No Lemon Squeezy variant configured for ${tier}/${interval}.` };
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!apiKey || !storeId) {
    console.error("[lemonsqueezy checkout] LEMONSQUEEZY_API_KEY/LEMONSQUEEZY_STORE_ID not configured.");
    return { ok: false, error: "Lemon Squeezy is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(`${LEMONSQUEEZY_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email ?? undefined,
              // Read back by the webhook via meta.custom_data.workspace_id
              // (see lib/subscriptionSync.ts). Lemon Squeezy echoes this
              // custom block onto every subsequent event tied to the
              // resulting subscription/order.
              custom: { workspace_id: workspace.id },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });
  } catch (err) {
    console.error("[lemonsqueezy checkout] request failed:", err);
    return { ok: false, error: "Could not reach Lemon Squeezy." };
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[lemonsqueezy checkout] create failed: ${res.status} ${body}`);
    return { ok: false, error: "Could not create checkout session." };
  }

  const json = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = json.data?.attributes?.url;
  if (!url) {
    console.error("[lemonsqueezy checkout] response missing checkout URL", json);
    return { ok: false, error: "Could not create checkout session." };
  }

  return { ok: true, url };
}

// Phase 2 (Safepay): builds a Safepay hosted subscription checkout URL for
// the caller's current workspace. Uses checkout.createSubscription() rather
// than the one-time checkout.create() since our plans are recurring
// monthly/yearly PKR subscriptions -- createSubscription internally requests
// an authorization token via authorization.create() and returns a signed
// /subscribe URL (see node_modules/@sfpy/node-sdk/dist/resources/checkout.js),
// so there's no need to do that two-step dance ourselves.
//
// workspace.id is passed as `reference`. The SDK appends it as a literal
// `reference` query param on the generated checkout URL, and `reference` is
// also a field on Safepay's canonical subscription resource shape
// (SubscriptionProps in dist/types/subscription.d.ts -- the same shape
// returned by subscription.cancel/pause/resume). Phase 3's webhook handler
// should read this same field back out of the event payload to resolve which
// workspace a subscription belongs to, the same way lib/subscriptionSync.ts
// reads meta.custom_data.workspace_id for Lemon Squeezy.
export async function createSafepayCheckoutUrl(tier: Plan, interval: BillingInterval): Promise<CreateCheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) return { ok: false, error: "No workspace found." };

  // Same role gate as createCheckoutUrl above.
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return { ok: false, error: "Only workspace owners/admins can manage billing." };
  }

  const planId = planIdForTier(tier, interval);
  if (!planId) {
    return { ok: false, error: `No Safepay plan configured for ${tier}/${interval}.` };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[safepay checkout] NEXT_PUBLIC_APP_URL is not set -- cannot build redirect URLs.");
    return { ok: false, error: "App URL is not configured." };
  }

  let url: string;
  try {
    const safepay = getSafepayClient();
    url = await safepay.checkout.createSubscription({
      planId,
      reference: workspace.id,
      // /settings doesn't exist as a route (404'd in testing) -- the real
      // Settings page is /dashboard/settings. ?tab=billing does work as a
      // deep link there: SettingsPageClient reads searchParams.get("tab")
      // once on mount to seed its initial tab state (see
      // app/dashboard/settings/SettingsPageClient.tsx), it's just that
      // clicking between tabs afterward doesn't push the URL, which is why
      // the address bar never shows ?tab= once the page is already open.
      // ?safepay=success/cancel isn't read by anything yet (BillingTab
      // doesn't consume it -- that's Phase 5), but Next.js ignores unknown
      // query params, so it's a harmless forward-compatible signal for when
      // that lands rather than something that could break routing now.
      cancelUrl: `${appUrl}/dashboard/settings?tab=billing&safepay=cancel`,
      redirectUrl: `${appUrl}/dashboard/settings?tab=billing&safepay=success`,
    });
  } catch (err) {
    console.error("[safepay checkout] createSubscription failed:", err);
    return { ok: false, error: "Could not create checkout session." };
  }

  // createSubscription's internal .catch() resolves with the raw Error
  // object from authorization.create() instead of rejecting (see
  // checkout.js) -- its declared return type (Promise<string>) doesn't
  // reflect that, so guard defensively rather than trusting the type.
  if (typeof url !== "string" || !url) {
    console.error("[safepay checkout] createSubscription resolved without a URL:", url);
    return { ok: false, error: "Could not create checkout session." };
  }

  return { ok: true, url };
}

export type CustomerPortalResult = { ok: true; url: string } | { ok: false; error: string };

// Phase 5: fetches a fresh Lemon Squeezy customer portal URL for the
// workspace's most recent subscription (payment method updates, invoice
// history, self-serve cancellation all live there). Deliberately fetched
// on demand rather than stored at webhook time -- Lemon Squeezy's
// subscription "urls" (customer_portal, update_payment_method, ...) are
// short-lived signed links regenerated on every read, not stable values
// worth persisting, so BillingTab calls this each time "Manage
// Subscription" is clicked instead of reading a column that would go
// stale long before most customers come back to use it.
export async function getCustomerPortalUrl(): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) return { ok: false, error: "No workspace found." };

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return { ok: false, error: "Only workspace owners/admins can manage billing." };
  }

  // Most recently touched row -- a workspace can accumulate multiple
  // historical subscriptions (see sql/subscriptions_schema.sql) if it was
  // cancelled and later resubscribed under a new lemon_subscription_id;
  // the latest one is always the relevant one for "manage my subscription".
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("lemon_subscription_id")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ lemon_subscription_id: string }>();

  if (!subscription) {
    return { ok: false, error: "No subscription found for this workspace." };
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    console.error("[lemonsqueezy portal] LEMONSQUEEZY_API_KEY not configured.");
    return { ok: false, error: "Lemon Squeezy is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(`${LEMONSQUEEZY_API_BASE}/subscriptions/${subscription.lemon_subscription_id}`, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (err) {
    console.error("[lemonsqueezy portal] request failed:", err);
    return { ok: false, error: "Could not reach Lemon Squeezy." };
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[lemonsqueezy portal] fetch failed: ${res.status} ${body}`);
    return { ok: false, error: "Could not load the customer portal." };
  }

  const json = (await res.json()) as { data?: { attributes?: { urls?: { customer_portal?: string } } } };
  const url = json.data?.attributes?.urls?.customer_portal;
  if (!url) {
    console.error("[lemonsqueezy portal] response missing customer_portal URL", json);
    return { ok: false, error: "Could not load the customer portal." };
  }

  return { ok: true, url };
}
