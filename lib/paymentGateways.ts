import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Admin-controlled payment gateway toggles: reads app_settings the exact
// same way lib/groq.ts's provider-mode/OpenAI-fallback settings already
// do (plain key/value row, short in-process cache, invalidated on write) --
// no new settings mechanism, same table, same shape. One parameterized
// implementation for both gateways rather than two near-duplicate copies
// (the way groq.ts has one function per flag), since "centralized, no
// duplicate logic" is an explicit requirement here and there's no reason
// two boolean toggles need two hand-written cache blocks.

export type PaymentGateway = "safepay" | "lemonsqueezy";

const SETTINGS_KEY: Record<PaymentGateway, string> = {
  safepay: "payment_gateway_safepay_enabled",
  lemonsqueezy: "payment_gateway_lemonsqueezy_enabled",
};

// Fail-safe defaults, used whenever the row is missing OR the DB can't be
// reached at all -- Lemon Squeezy is the confirmed-working gateway, so it
// defaults open; Safepay defaults closed because it isn't live yet (see
// lib/actions/aiCreditsTopUp.ts's OPEN GAP comments for the specific
// top-up metadata issue). A DB hiccup must never silently turn Safepay on.
const DEFAULT_ENABLED: Record<PaymentGateway, boolean> = {
  safepay: false,
  lemonsqueezy: true,
};

export async function fetchPaymentGatewayEnabledFromDb(supabase: SupabaseClient, gateway: PaymentGateway): Promise<boolean> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY[gateway])
    .maybeSingle<{ value: string }>();

  const value = data?.value;
  if (value === "true") return true;
  if (value === "false") return false;
  return DEFAULT_ENABLED[gateway];
}

const CACHE_MS = 5000;
const cache: Partial<Record<PaymentGateway, boolean>> = {};
const cachedAt: Partial<Record<PaymentGateway, number>> = {};

// Called by the admin toggle route right after a successful write, same
// reasoning as invalidateProviderModeCache()/invalidateOpenAiFallbackCache()
// in lib/groq.ts -- so this process's very next read reflects the change
// immediately instead of waiting out the cache window.
export function invalidatePaymentGatewayCache(gateway?: PaymentGateway) {
  if (gateway) {
    delete cache[gateway];
    delete cachedAt[gateway];
  } else {
    delete cache.safepay;
    delete cache.lemonsqueezy;
    delete cachedAt.safepay;
    delete cachedAt.lemonsqueezy;
  }
}

// The read path both payment modals go through (via the "use server"
// wrapper in lib/actions/paymentGateways.ts) -- fails closed to the same
// DEFAULT_ENABLED a missing row would give, never to "enabled", so a
// transient DB error can't accidentally expose the not-yet-live Safepay
// option.
export async function getPaymentGatewayEnabled(gateway: PaymentGateway): Promise<boolean> {
  const now = Date.now();
  const cached = cache[gateway];
  const cachedTime = cachedAt[gateway];
  if (cached !== undefined && cachedTime !== undefined && now - cachedTime < CACHE_MS) {
    return cached;
  }

  try {
    const supabase = await createClient();
    const enabled = await fetchPaymentGatewayEnabledFromDb(supabase, gateway);
    cache[gateway] = enabled;
    cachedAt[gateway] = now;
    return enabled;
  } catch {
    return DEFAULT_ENABLED[gateway];
  }
}
