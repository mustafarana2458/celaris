"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createCheckoutUrl, createSafepayCheckoutUrl, getCustomerPortalUrl } from "@/lib/actions/billing";
import { detailsForVariant, type BillingInterval } from "@/lib/lemonSqueezy";
import { tierAndIntervalForPlanId } from "@/lib/safepay";
import { getPlanLimit, type Plan, type RemainingCredits } from "@/lib/aiCreditsCore";
import type { CurrentWorkspace } from "@/lib/workspace";
import type { WorkspaceSubscription } from "../page";

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
  credits,
}: {
  workspace: CurrentWorkspace | null;
  subscription: WorkspaceSubscription | null;
  credits: RemainingCredits | null;
}) {
  const currentTier: Plan | null =
    workspace && workspace.plan in TIER_RANK ? (workspace.plan as Plan) : null;
  const currentRank = currentTier ? TIER_RANK[currentTier] : 0;

  // A cancelled-but-not-yet-expired row still grants access (both gateways
  // keep it around until current_period_end -- see lib/subscriptionSync.ts
  // / lib/safepaySubscriptionSync.ts), so it's still "the subscription" for
  // status/interval/manage-subscription purposes. Only "expired" means
  // there's genuinely nothing to manage.
  const hasManageableSubscription = subscription !== null && subscription.status !== "expired";
  // Interval is derived differently per gateway -- LS rows carry a
  // variant_id (one of 6 LS variants, decoded via detailsForVariant()),
  // Safepay rows carry a plan_id (one of 6 Safepay plans, decoded via
  // tierAndIntervalForPlanId()). subscription.provider says which decoder
  // applies; the other gateway's id column is null on that row.
  const currentInterval: BillingInterval | null = subscription
    ? subscription.provider === "safepay"
      ? (tierAndIntervalForPlanId(subscription.plan_id)?.interval ?? null)
      : (detailsForVariant(subscription.variant_id)?.interval ?? null)
    : null;

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

  if (!workspace) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        No workspace found.
      </div>
    );
  }

  const periodEndLabel = formatDate(subscription?.current_period_end ?? null);
  const limit = getPlanLimit(workspace.plan);

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
              {credits ? `${credits.used} / ${limit} used` : `-- / ${limit}`}
            </dd>
          </div>
        </dl>

        {credits && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full ${credits.remaining === 0 ? "bg-red-500" : "bg-accent"}`}
              style={{ width: `${Math.min(100, (credits.used / Math.max(1, limit)) * 100)}%` }}
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

            <div className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/5 p-4 dark:bg-accent/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Safepay</span>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  Preferred for Pakistan
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pay in PKR via local cards, bank transfer, or wallets.
              </p>
              <Button
                type="button"
                variant="primary"
                loading={isSafepayLoading}
                disabled={checkoutLoading !== null}
                onClick={() => handleSafepayCheckout(gatewayModalTarget.tier, gatewayModalTarget.interval)}
              >
                Pay with Safepay (PKR)
              </Button>
            </div>

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
