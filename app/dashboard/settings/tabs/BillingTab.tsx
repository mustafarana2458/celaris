"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createCheckoutUrl, createSafepayCheckoutUrl, getCustomerPortalUrl } from "@/lib/actions/billing";
import { getEnabledPaymentGateways, type PaymentGatewaysEnabled } from "@/lib/actions/paymentGateways";
import type { BillingInterval } from "@/lib/lemonSqueezy";
import { getPlanLimit, type Plan, type RemainingCredits } from "@/lib/aiCreditsCore";
import type { CurrentWorkspace } from "@/lib/workspace";
import type { WorkspaceSubscription } from "../page";

// Same admin-controlled gateway toggle both payment modals read (see
// components/assistant/TopUpCreditsModal.tsx's identical comment) -- one
// setting, fetched via the same server action, so this modal and the AI
// credit top-up modal can never disagree about which gateways are live.
const DEFAULT_GATEWAYS: PaymentGatewaysEnabled = { lemonsqueezy: true, safepay: false };

// Promo Code Engine Phase 3: response shape of POST /api/promo/redeem (see
// app/api/promo/redeem/route.ts) -- kept in sync with that route's actual
// return value, not the RPC's raw column names.
type PromoReward = { type: string; payload: Record<string, unknown>; expiresAt: string | null };
// purchased_ai_credits added alongside sql/fix_promo_ai_credits.sql -- the
// ai_credits reward now grants there instead of decrementing ai_credits_used.
type PromoRedeemResponse =
  | { ok: true; reward: PromoReward; workspace: { plan: string; ai_credits_used: number; purchased_ai_credits: number } }
  | { ok: false; error: string; code?: string };

const PROMO_ERROR_FALLBACK: Record<string, string> = {
  INVALID: "That promo code isn't valid.",
  EXPIRED: "That promo code has expired.",
  ALREADY_REDEEMED: "This code has already been redeemed.",
  CAP_REACHED: "This promo code has reached its redemption limit.",
  UNSUPPORTED: "This promo code type isn't supported yet.",
};

// Human-facing summary of what redeeming actually granted. reward.payload
// is untyped JSON from the DB (see promo_codes.reward_payload), so this
// reads defensively rather than trusting its shape.
function describePromoReward(reward: PromoReward): string {
  if (reward.type === "ai_credits") {
    const credits = Number(reward.payload.credits ?? 0);
    return `Code applied! +${credits.toLocaleString()} AI credits added.`;
  }
  if (reward.type === "temp_plan_access") {
    const planId = typeof reward.payload.plan === "string" ? reward.payload.plan : "";
    const planName = TIER_CARDS.find((t) => t.id === planId)?.name ?? planId;
    const days = Number(reward.payload.duration_days ?? 0);
    return `Code applied! Upgraded to ${planName} plan for ${days} day${days === 1 ? "" : "s"}.`;
  }
  return "Code applied!";
}

const TIER_RANK: Record<Plan, number> = { solo: 1, team: 2, scale: 3 };

const TIER_CARDS: { id: Plan; name: string; description: string; monthlyPrice: number; yearlyMonthlyPrice: number }[] = [
  { id: "solo", name: "Solo", description: "For freelancers & solopreneurs.", monthlyPrice: 25, yearlyMonthlyPrice: 21 },
  { id: "team", name: "Team", description: "For agencies & studios.", monthlyPrice: 83, yearlyMonthlyPrice: 70 },
  { id: "scale", name: "Scale", description: "For growing SMBs.", monthlyPrice: 199, yearlyMonthlyPrice: 165 },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  on_trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  cancelled: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  past_due: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  paused: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  incomplete: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_trial: "Trial",
  cancelled: "Cancelled",
  past_due: "Past Due",
  unpaid: "Unpaid",
  paused: "Paused",
  expired: "Expired",
  // Safepay-only pre-payment status -- a checkout that was started but
  // never completed (see lib/safepaySubscriptionSync.ts's
  // subscription.created handling).
  incomplete: "Incomplete",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function BillingTab({
  workspace,
  subscription,
  subscriptionInterval,
  credits,
}: {
  workspace: CurrentWorkspace | null;
  subscription: WorkspaceSubscription | null;
  subscriptionInterval: BillingInterval | null;
  credits: RemainingCredits | null;
}) {
  const router = useRouter();

  // Set from a successful promo redemption's response (see
  // handleRedeemPromoCode below) so the current-plan card and credit
  // counters update immediately, without waiting on router.refresh()'s
  // round trip back to the Server Component. router.refresh() is still
  // called too, to reconcile everything else this page depends on (e.g.
  // if a future reward type ever touches subscription/interval).
  const [promoWorkspaceOverride, setPromoWorkspaceOverride] = useState<{
    plan: string;
    ai_credits_used: number;
    purchased_ai_credits: number;
  } | null>(null);
  const effectivePlan = promoWorkspaceOverride?.plan ?? workspace?.plan ?? null;

  const currentTier: Plan | null = effectivePlan && effectivePlan in TIER_RANK ? (effectivePlan as Plan) : null;
  const currentRank = currentTier ? TIER_RANK[currentTier] : 0;

  // A cancelled-but-not-yet-expired row still grants access (both gateways
  // keep it around until current_period_end -- see lib/subscriptionSync.ts
  // / lib/safepaySubscriptionSync.ts), so it's still "the subscription" for
  // status/interval/manage-subscription purposes. Only "expired" means
  // there's genuinely nothing to manage.
  const hasManageableSubscription = subscription !== null && subscription.status !== "expired";
  // Passed down from the settings page.tsx Server Component rather than
  // derived here -- detailsForVariant()/tierAndIntervalForPlanId() read
  // plain (non-NEXT_PUBLIC_) env vars, which don't exist in the client
  // bundle. Calling them from this "use client" component would always
  // hit an empty lookup map and return null, which is exactly why the
  // current-plan card previously never matched on interval.
  const currentInterval = subscriptionInterval;

  const searchParams = useSearchParams();
  const requestedSafepayNotice = searchParams.get("safepay");
  const [safepayNotice, setSafepayNotice] = useState<"success" | "cancel" | null>(
    requestedSafepayNotice === "success" || requestedSafepayNotice === "cancel" ? requestedSafepayNotice : null
  );

  const [billing, setBilling] = useState<BillingInterval>(currentInterval ?? "monthly");
  // Set when a plan card's Upgrade/Switch button is clicked -- opens the
  // gateway-choice modal for that specific tier+interval. Cleared on
  // close, on a successful LS checkout (new tab opened, nothing left to do
  // on this page), or on a checkout error (falls back to the bottom error
  // banner rather than an in-modal one). Not cleared on a successful
  // Safepay checkout since that navigates the whole page away.
  const [gatewayModalTarget, setGatewayModalTarget] = useState<{ tier: Plan; interval: BillingInterval } | null>(null);
  // Keyed "safepay-{tier}-{interval}" / "ls-{tier}-{interval}" rather than
  // just "{tier}-{interval}" -- the modal offers both gateways for the same
  // tier/interval, so the loading spinner needs to land on whichever
  // button was actually clicked.
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateways, setGateways] = useState<PaymentGatewaysEnabled>(DEFAULT_GATEWAYS);

  useEffect(() => {
    if (!gatewayModalTarget) return;
    let cancelled = false;
    getEnabledPaymentGateways().then((result) => {
      if (!cancelled) setGateways(result);
    });
    return () => {
      cancelled = true;
    };
  }, [gatewayModalTarget]);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  async function handleCheckout(tier: Plan, interval: BillingInterval) {
    if (checkoutLoading) return;
    const key = `ls-${tier}-${interval}`;
    setCheckoutLoading(key);
    setError(null);

    const result = await createCheckoutUrl(tier, interval);
    setCheckoutLoading(null);
    if (!result.ok) {
      setGatewayModalTarget(null);
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
    setGatewayModalTarget(null);
  }

  async function handleSafepayCheckout(tier: Plan, interval: BillingInterval) {
    if (checkoutLoading) return;
    const key = `safepay-${tier}-${interval}`;
    setCheckoutLoading(key);
    setError(null);

    const result = await createSafepayCheckoutUrl(tier, interval);
    if (!result.ok) {
      setCheckoutLoading(null);
      setGatewayModalTarget(null);
      setError(result.error);
      return;
    }
    // A real redirect, not a new tab -- Safepay's hosted checkout needs to
    // own the top-level navigation for its redirect_url/cancel_url round
    // trip back to /dashboard/settings?tab=billing&safepay=... to work.
    // No need to clear gatewayModalTarget -- the page is navigating away.
    window.location.href = result.url;
  }

  async function handleManageSubscription() {
    if (portalLoading) return;
    setPortalLoading(true);
    setError(null);

    const result = await getCustomerPortalUrl();
    setPortalLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function handleRedeemPromoCode() {
    const code = promoCode.trim();
    if (!code || promoLoading) return;

    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    let json: PromoRedeemResponse | null = null;
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      json = (await res.json()) as PromoRedeemResponse;
    } catch {
      setPromoLoading(false);
      setPromoError("Could not reach the server. Try again.");
      return;
    }

    setPromoLoading(false);

    if (!json.ok) {
      setPromoError(json.error || (json.code && PROMO_ERROR_FALLBACK[json.code]) || "Could not redeem this promo code.");
      return;
    }

    setPromoCode("");
    setPromoSuccess(describePromoReward(json.reward));
    setPromoWorkspaceOverride(json.workspace);
    // Reconciles subscription/interval and anything else this page reads
    // server-side (e.g. the sidebar's AI usage widget) with the DB state
    // the RPC just wrote -- the override above is only for this card's
    // own immediate feedback.
    router.refresh();
  }

  if (!workspace) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        No workspace found.
      </div>
    );
  }

  const periodEndLabel = formatDate(subscription?.current_period_end ?? null);
  const limit = getPlanLimit(effectivePlan);
  const effectiveCredits: RemainingCredits | null = promoWorkspaceOverride
    ? {
        used: promoWorkspaceOverride.ai_credits_used,
        limit,
        remaining: Math.max(0, limit - promoWorkspaceOverride.ai_credits_used),
        // An ai_credits reward now grants into purchased_ai_credits (see
        // sql/fix_promo_ai_credits.sql), so the RPC's response carries the
        // real post-redemption value here -- no longer a stale reuse of
        // the pre-redemption workspace prop.
        purchased: promoWorkspaceOverride.purchased_ai_credits,
        totalRemaining: Math.max(0, limit - promoWorkspaceOverride.ai_credits_used) + promoWorkspaceOverride.purchased_ai_credits,
      }
    : credits;

  const modalTierCard = gatewayModalTarget ? TIER_CARDS.find((t) => t.id === gatewayModalTarget.tier) : null;
  const modalPrice =
    gatewayModalTarget && modalTierCard
      ? gatewayModalTarget.interval === "yearly"
        ? modalTierCard.yearlyMonthlyPrice
        : modalTierCard.monthlyPrice
      : null;
  const isSafepayLoading = gatewayModalTarget
    ? checkoutLoading === `safepay-${gatewayModalTarget.tier}-${gatewayModalTarget.interval}`
    : false;
  const isLsModalLoading = gatewayModalTarget
    ? checkoutLoading === `ls-${gatewayModalTarget.tier}-${gatewayModalTarget.interval}`
    : false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Billing</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your subscription plan and payment details.
        </p>
      </div>

      {safepayNotice === "success" && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span>Payment successful -- your plan has been updated.</span>
          <button
            type="button"
            onClick={() => setSafepayNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ×
          </button>
        </div>
      )}
      {safepayNotice === "cancel" && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          <span>Checkout cancelled -- no changes were made.</span>
          <button
            type="button"
            onClick={() => setSafepayNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ×
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-accent bg-white p-6 ring-2 ring-accent/20 dark:bg-slate-800">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold capitalize text-slate-900 dark:text-slate-100">
                {currentTier ? `${currentTier} Plan` : "Free Plan"}
              </h3>
              {subscription && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    STATUS_STYLES[subscription.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {STATUS_LABELS[subscription.status] ?? subscription.status}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subscription?.status === "cancelled" && periodEndLabel
                ? `Access continues until ${periodEndLabel}.`
                : currentTier
                  ? "Current plan"
                  : "Upgrade below to unlock more AI credits and team seats."}
            </p>
            {subscription && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Paid via {subscription.provider === "safepay" ? "Safepay" : "Lemon Squeezy"}
              </p>
            )}
          </div>
          {hasManageableSubscription &&
            (subscription?.provider === "safepay" ? (
              // No Safepay-side customer portal exists in this integration
              // yet (getCustomerPortalUrl in lib/actions/billing.ts is
              // Lemon-Squeezy-only -- calling it for a Safepay subscription
              // would silently manage the wrong gateway, or error, since it
              // looks up lemon_subscription_id). Until a Safepay cancel/
              // manage action exists, surface this as a note rather than a
              // button that does the wrong thing.
              <p className="max-w-[16rem] text-right text-xs text-slate-400 dark:text-slate-500">
                Managed via Safepay -- contact support to change or cancel.
              </p>
            ) : (
              <Button type="button" onClick={handleManageSubscription} loading={portalLoading}>
                Manage Subscription
              </Button>
            ))}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3 dark:border-slate-700">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Billing cycle
            </dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">
              {currentInterval ?? "--"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {subscription?.status === "cancelled" ? "Access ends" : "Next billing date"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {periodEndLabel ?? "--"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              AI credits
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {effectiveCredits ? `${effectiveCredits.used} / ${limit} used` : `-- / ${limit}`}
            </dd>
          </div>
        </dl>

        {effectiveCredits && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full ${effectiveCredits.remaining === 0 ? "bg-red-500" : "bg-accent"}`}
              style={{ width: `${Math.min(100, (effectiveCredits.used / Math.max(1, limit)) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Plans</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upgrade or switch plans -- takes you to a secure checkout.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                billing === "monthly"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                billing === "yearly"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {TIER_CARDS.map((tier) => {
            const price = billing === "yearly" ? tier.yearlyMonthlyPrice : tier.monthlyPrice;
            const isCurrentTier = tier.id === currentTier;
            const isCurrentInterval = isCurrentTier && currentInterval === billing;

            return (
              <div
                key={tier.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 ${
                  isCurrentTier
                    ? "border-accent bg-accent/5 dark:bg-accent/10"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tier.name}</h4>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tier.description}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">${price}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getPlanLimit(tier.id).toLocaleString()} AI credits / month
                </p>
                {isCurrentInterval ? (
                  <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-accent/15 px-4 py-2.5 text-sm font-medium text-accent-hover dark:bg-accent/20 dark:text-accent">
                    Current Plan
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant={isCurrentTier ? "secondary" : TIER_RANK[tier.id] > currentRank ? "primary" : "secondary"}
                    className="mt-auto"
                    disabled={checkoutLoading !== null}
                    onClick={() => setGatewayModalTarget({ tier: tier.id, interval: billing })}
                  >
                    {isCurrentTier
                      ? `Switch to ${billing === "yearly" ? "Yearly" : "Monthly"}`
                      : TIER_RANK[tier.id] > currentRank
                        ? "Upgrade"
                        : "Switch"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(workspace.role === "owner" || workspace.role === "admin") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Promo Code</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Have a promo code? Redeem it below for AI credits or plan access.
          </p>

          {promoSuccess && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span>{promoSuccess}</span>
              <button
                type="button"
                onClick={() => setPromoSuccess(null)}
                aria-label="Dismiss"
                className="shrink-0 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                ×
              </button>
            </div>
          )}
          {promoError && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <span>{promoError}</span>
              <button
                type="button"
                onClick={() => setPromoError(null)}
                aria-label="Dismiss"
                className="shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRedeemPromoCode();
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Input
                label="Have a promo code?"
                name="promoCode"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="e.g. WELCOME500"
                disabled={promoLoading}
              />
            </div>
            <Button type="submit" loading={promoLoading} disabled={!promoCode.trim()}>
              Apply Code
            </Button>
          </form>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {gatewayModalTarget && modalTierCard && (
        <Modal
          open
          onClose={() => {
            if (checkoutLoading === null) setGatewayModalTarget(null);
          }}
          title="Choose a payment method"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {modalTierCard.name} Plan -- {gatewayModalTarget.interval === "yearly" ? "Yearly" : "Monthly"}
              {modalPrice !== null && <> (${modalPrice}/mo)</>}
            </p>

            {gateways.safepay && (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Safepay</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pay in PKR via local cards, bank transfer, or wallets.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  loading={isSafepayLoading}
                  disabled={checkoutLoading !== null}
                  onClick={() => handleSafepayCheckout(gatewayModalTarget.tier, gatewayModalTarget.interval)}
                >
                  Pay with Safepay (PKR)
                </Button>
              </div>
            )}

            {gateways.lemonsqueezy && (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lemon Squeezy</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  International card payments (USD).
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  loading={isLsModalLoading}
                  disabled={checkoutLoading !== null}
                  onClick={() => handleCheckout(gatewayModalTarget.tier, gatewayModalTarget.interval)}
                >
                  Pay with card (International)
                </Button>
              </div>
            )}

            {!gateways.safepay && !gateways.lemonsqueezy && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No payment methods are currently available. Please contact support.
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={checkoutLoading !== null}
                onClick={() => setGatewayModalTarget(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
