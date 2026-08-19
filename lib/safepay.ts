import { Safepay } from "@sfpy/node-sdk";
import type { Plan } from "@/lib/aiCreditsCore";

export type BillingInterval = "monthly" | "yearly";

// Single source of truth for the 3 tiers x monthly/yearly = 6 Safepay plans:
// which env var holds each one's plan id. Mirrors the TIER_INTERVAL_ENV
// pattern in lib/lemonSqueezy.ts so both providers stay consistent.
const TIER_INTERVAL_ENV: Record<Plan, Record<BillingInterval, string>> = {
  solo: { monthly: "SAFEPAY_PLAN_SOLO_MONTHLY", yearly: "SAFEPAY_PLAN_SOLO_YEARLY" },
  team: { monthly: "SAFEPAY_PLAN_TEAM_MONTHLY", yearly: "SAFEPAY_PLAN_TEAM_YEARLY" },
  scale: { monthly: "SAFEPAY_PLAN_SCALE_MONTHLY", yearly: "SAFEPAY_PLAN_SCALE_YEARLY" },
};

// tier+interval -> the configured plan id, or null if that env var isn't set.
export function planIdForTier(tier: Plan, interval: BillingInterval): string | null {
  return process.env[TIER_INTERVAL_ENV[tier][interval]] ?? null;
}

// plan_id -> {tier, interval}, built lazily and cached on first call rather
// than at module load, so importing this file never throws just because a
// var isn't set yet -- an unrecognized/missing plan id simply fails to map
// (caller decides what to do with `null`).
type PlanDetails = { tier: Plan; interval: BillingInterval };

let planDetails: Map<string, PlanDetails> | null = null;

function buildPlanMap(): Map<string, PlanDetails> {
  const map = new Map<string, PlanDetails>();
  for (const tier of Object.keys(TIER_INTERVAL_ENV) as Plan[]) {
    for (const interval of Object.keys(TIER_INTERVAL_ENV[tier]) as BillingInterval[]) {
      const planId = process.env[TIER_INTERVAL_ENV[tier][interval]];
      if (planId) map.set(planId, { tier, interval });
    }
  }
  return map;
}

export function tierAndIntervalForPlanId(planId: string | null | undefined): PlanDetails | null {
  if (!planId) return null;
  if (!planDetails) planDetails = buildPlanMap();
  return planDetails.get(planId) ?? null;
}

// --- SDK client ---

// The SDK's top-level export only exposes the `Safepay` class -- its
// `Environment` enum and `SafepayOptions` type aren't re-exported from the
// package root (see dist/index.d.ts), so we derive the environment type
// structurally from the constructor itself rather than reaching into
// internal, unpublished paths.
type SafepayConstructorOptions = ConstructorParameters<typeof Safepay>[0];
type SafepayEnvironment = SafepayConstructorOptions["environment"];
const VALID_ENVIRONMENTS: string[] = ["sandbox", "production", "development"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[safepay] Missing required env var: ${name}`);
  }
  return value;
}

let client: Safepay | null = null;

// Instantiates (and caches) the Safepay SDK client. The SDK itself picks the
// correct base URL (sandbox/production/development) from `environment`, so
// nothing else needs to be configured here.
//
// Note: the SDK's own constructor validation requires `webhookSecret` to be
// present -- it throws if it's missing, even though nothing in Phase 1-2
// calls verify.webhook() yet. SAFEPAY_WEBHOOK_SECRET isn't set until Phase 3,
// so calling this before then will throw; that's expected and fine as long
// as nothing outside of Phase 3's webhook route calls it yet.
export function getSafepayClient(): Safepay {
  if (client) return client;

  const environment = requireEnv("SAFEPAY_ENVIRONMENT");
  if (!VALID_ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `[safepay] SAFEPAY_ENVIRONMENT must be one of ${VALID_ENVIRONMENTS.join(", ")} (got "${environment}")`
    );
  }

  client = new Safepay({
    environment: environment as SafepayEnvironment,
    apiKey: requireEnv("SAFEPAY_PUBLIC_KEY"),
    v1Secret: requireEnv("SAFEPAY_SECRET_KEY"),
    webhookSecret: requireEnv("SAFEPAY_WEBHOOK_SECRET"),
  });
  return client;
}
