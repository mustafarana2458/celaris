import type { Plan } from "@/lib/aiCreditsCore";

export type BillingInterval = "monthly" | "yearly";

// Single source of truth for the 3 tiers x monthly/yearly = 6 Lemon
// Squeezy variants: which env var holds each one's variant id. Both
// directions (variant_id -> tier, for the webhook; tier+interval ->
// variant_id, for building a checkout) are derived from this one map so
// there's only one place to fix if a var name ever changes.
const TIER_INTERVAL_ENV: Record<Plan, Record<BillingInterval, string>> = {
  solo: { monthly: "LEMONSQUEEZY_VARIANT_SOLO_MONTHLY", yearly: "LEMONSQUEEZY_VARIANT_SOLO_YEARLY" },
  team: { monthly: "LEMONSQUEEZY_VARIANT_TEAM_MONTHLY", yearly: "LEMONSQUEEZY_VARIANT_TEAM_YEARLY" },
  scale: { monthly: "LEMONSQUEEZY_VARIANT_SCALE_MONTHLY", yearly: "LEMONSQUEEZY_VARIANT_SCALE_YEARLY" },
};

// tier+interval -> the configured variant id, or null if that env var
// isn't set. Used by the checkout builder (lib/actions/billing.ts).
export function variantForTier(tier: Plan, interval: BillingInterval): string | null {
  return process.env[TIER_INTERVAL_ENV[tier][interval]] ?? null;
}

// variant_id -> {tier, interval}, built lazily and cached on first call
// rather than at module load, so importing this file never throws just
// because a var isn't set yet -- an unrecognized/missing variant simply
// fails to map (caller decides what to do with `null`). Used by the
// webhook handler (lib/subscriptionSync.ts) and BillingTab (to know which
// interval the workspace's active subscription is on).
type VariantDetails = { tier: Plan; interval: BillingInterval };

let variantDetails: Map<string, VariantDetails> | null = null;

function buildVariantMap(): Map<string, VariantDetails> {
  const map = new Map<string, VariantDetails>();
  for (const tier of Object.keys(TIER_INTERVAL_ENV) as Plan[]) {
    for (const interval of Object.keys(TIER_INTERVAL_ENV[tier]) as BillingInterval[]) {
      const variantId = process.env[TIER_INTERVAL_ENV[tier][interval]];
      if (variantId) map.set(variantId, { tier, interval });
    }
  }
  return map;
}

// Lemon Squeezy sends variant_id as a JSON:API string; accepts number too
// since some payload fields (e.g. attributes.variant_id) come through as a
// number rather than a string.
export function detailsForVariant(variantId: string | number | null | undefined): VariantDetails | null {
  if (variantId === null || variantId === undefined) return null;
  if (!variantDetails) variantDetails = buildVariantMap();
  return variantDetails.get(String(variantId)) ?? null;
}

export function tierForVariant(variantId: string | number | null | undefined): Plan | null {
  return detailsForVariant(variantId)?.tier ?? null;
}
