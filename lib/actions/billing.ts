"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { variantForTier, type BillingInterval } from "@/lib/lemonSqueezy";
import type { Plan } from "@/lib/aiCreditsCore";

export type CreateCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

// Phase 4: builds a Lemon Squeezy hosted checkout URL for the caller's
// current workspace, embedding workspace_id in checkout_data.custom so
// Phase 3's webhook handler (lib/subscriptionSync.ts) can resolve which
// workspace to sync without falling back to a prior-row lookup. Not wired
// into BillingTab yet (Phase 5) -- for now this is only reachable from the
// Dev Panel's test-checkout section (lib/actions/devPanel.ts), so the
// checkout -> webhook -> DB flow can be exercised end-to-end before any
// real upgrade UI exists.
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
