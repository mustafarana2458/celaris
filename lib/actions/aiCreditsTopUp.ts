"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getSafepayClient } from "@/lib/safepay";
import { TOPUP_MIN_CREDITS, TOPUP_MAX_CREDITS, TOPUP_CENTS_PER_CREDIT, isValidTopUpAmount } from "@/lib/aiCreditsCore";

// Celaris Improvements Phase 3: one-time AI credit top-up checkout.
// Deliberately a NEW file rather than adding to lib/actions/billing.ts --
// that file's functions are all subscription/plan-tier checkout builders
// (variantForTier/planIdForTier, recurring), and a one-time, variable-
// amount purchase doesn't fit that shape. Reuses the SAME gateway
// clients/patterns billing.ts already established (raw fetch() for Lemon
// Squeezy's REST API, the Safepay SDK client from lib/safepay.ts, the
// same owner/admin role gate) rather than inventing new ones.

export type CreateTopUpCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

async function requireBillingContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) return { ok: false, error: "No workspace found." } as const;

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return { ok: false, error: "Only workspace owners/admins can purchase AI credits." } as const;
  }

  return { ok: true, user, workspace } as const;
}

// Lemon Squeezy: uses checkout_data.custom_price (cents) to override the
// configured variant's price at checkout-creation time -- a documented LS
// API feature for "pay what you want" / custom-price-enabled variants.
// REQUIRES the LEMONSQUEEZY_TOPUP_VARIANT_ID variant to actually be
// configured as custom-price-enabled in the Lemon Squeezy dashboard --
// same manual setup step as the existing tier variants (see
// lib/lemonSqueezy.ts), flagged here since without it Lemon Squeezy
// would silently charge the variant's own fixed price instead of the
// chosen amount.
async function createLemonSqueezyTopUpCheckout(
  workspaceId: string,
  email: string | undefined,
  credits: number
): Promise<CreateTopUpCheckoutResult> {
  const variantId = process.env.LEMONSQUEEZY_TOPUP_VARIANT_ID;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  if (!variantId) {
    console.error("[lemonsqueezy topup checkout] LEMONSQUEEZY_TOPUP_VARIANT_ID is not configured.");
    return { ok: false, error: "AI credit top-ups aren't configured yet." };
  }
  if (!apiKey || !storeId) {
    console.error("[lemonsqueezy topup checkout] LEMONSQUEEZY_API_KEY/LEMONSQUEEZY_STORE_ID not configured.");
    return { ok: false, error: "Lemon Squeezy is not configured." };
  }

  const customPriceCents = credits * TOPUP_CENTS_PER_CREDIT;

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
              email: email ?? undefined,
              custom_price: customPriceCents,
              // Read back by the webhook (lib/creditTopUpSync.ts) via
              // meta.custom_data -- carrying `credits` explicitly means
              // the webhook never has to back-derive the credit count
              // from the charged amount (which would silently break if
              // TOPUP_CENTS_PER_CREDIT or currency ever changed between
              // checkout creation and webhook delivery).
              custom: { workspace_id: workspaceId, credits: String(credits), kind: "ai_credit_topup" },
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
    console.error("[lemonsqueezy topup checkout] request failed:", err);
    return { ok: false, error: "Could not reach Lemon Squeezy." };
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[lemonsqueezy topup checkout] create failed: ${res.status} ${body}`);
    return { ok: false, error: "Could not create checkout session." };
  }

  const json = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = json.data?.attributes?.url;
  if (!url) {
    console.error("[lemonsqueezy topup checkout] response missing checkout URL", json);
    return { ok: false, error: "Could not create checkout session." };
  }

  return { ok: true, url };
}

// Safepay: one-time payment via payments.create() (Safepay's Orders
// "init" endpoint, /order/v1/init) + checkout.create() -- distinct from
// createSafepayCheckoutUrl in lib/actions/billing.ts, which uses
// createSubscription() for the recurring plan-tier flow. UNTESTED --
// Safepay isn't live yet (see the Phase 3 report) -- with TWO open,
// unverified gaps flagged inline below. Do not treat this as
// confirmed-working the way the Lemon Squeezy path is; both gaps need a
// real sandbox test to resolve, not a guess shipped now.
async function createSafepayTopUpCheckout(workspaceId: string, credits: number): Promise<CreateTopUpCheckoutResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[safepay topup checkout] NEXT_PUBLIC_APP_URL is not set -- cannot build redirect URLs.");
    return { ok: false, error: "App URL is not configured." };
  }

  try {
    const safepay = getSafepayClient();

    // OPEN GAP 1 -- currency/amount unit: the SDK's PaymentsCreateParams
    // type only declares { amount: number, currency: SafepayCurrency },
    // with no documented unit (smallest-unit paisa vs. whole PKR)
    // confirmable from this repo. Existing subscription plans sidestep
    // this entirely -- each tier/interval has a pre-configured PKR price
    // set up directly in the Safepay dashboard (see lib/safepay.ts's
    // planIdForTier), never computed at runtime. A one-time,
    // variable-amount purchase has no such pre-configured price to fall
    // back on. USD_TO_PKR_RATE below is a PLACEHOLDER, not a confirmed
    // real exchange rate -- must be replaced (or this conversion
    // rethought entirely) before this path is trusted with real money.
    const USD_TO_PKR_RATE = 280;
    const amountPkr = Math.round(((credits * TOPUP_CENTS_PER_CREDIT) / 100) * USD_TO_PKR_RATE);

    const payment = await safepay.payments.create({ amount: amountPkr, currency: "PKR" });

    // OPEN GAP 2 -- workspace resolution at webhook time: unlike
    // createSubscription (which accepts `reference` directly and Safepay
    // echoes it back on every later event), checkout.create()'s builder
    // (node_modules/@sfpy/node-sdk/dist/resources/checkout.js) has NO
    // reference/metadata parameter at all, and payments.create()'s
    // declared return type is just { token: string } -- no confirmed
    // order/tracker id to persist anywhere for later matching. This is
    // deliberately NOT papered over with a guess: the webhook's
    // payment.succeeded event is known to carry `data.tracker` (see
    // lib/safepaySubscriptionSync.ts's comment), but nothing here can
    // currently prove which workspace a given tracker belongs to. Until
    // this is resolved (most likely by confirming the real /order/v1/init
    // response includes a usable id, and persisting a workspace_id-keyed
    // "pending topup" record before redirecting to checkout), a Safepay
    // top-up's webhook has no reliable way to credit the right workspace
    // -- see lib/creditTopUpSync.ts's syncSafepayCreditTopUp, which
    // currently only logs this case rather than guessing.
    const url = safepay.checkout.create({
      orderId: "",
      token: (payment as { token: string }).token,
      cancelUrl: `${appUrl}/dashboard/assistant?topup=cancel`,
      redirectUrl: `${appUrl}/dashboard/assistant?topup=success`,
    });

    return { ok: true, url };
  } catch (err) {
    console.error("[safepay topup checkout] failed:", err);
    return { ok: false, error: "Could not create checkout session." };
  }
}

export async function createCreditTopUpCheckoutUrl(
  credits: number,
  gateway: "lemonsqueezy" | "safepay"
): Promise<CreateTopUpCheckoutResult> {
  if (!isValidTopUpAmount(credits)) {
    return { ok: false, error: `Choose between ${TOPUP_MIN_CREDITS} and ${TOPUP_MAX_CREDITS} credits.` };
  }

  const ctx = await requireBillingContext();
  if (!ctx.ok) return ctx;

  if (gateway === "lemonsqueezy") {
    return createLemonSqueezyTopUpCheckout(ctx.workspace.id, ctx.user.email ?? undefined, credits);
  }
  return createSafepayTopUpCheckout(ctx.workspace.id, credits);
}
