"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createCheckoutUrl, getCustomerPortalUrl } from "@/lib/actions/billing";
import { detailsForVariant, type BillingInterval } from "@/lib/lemonSqueezy";
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
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_trial: "Trial",
  cancelled: "Cancelled",
  past_due: "Past Due",
  unpaid: "Unpaid",
  paused: "Paused",
  expired: "Expired",
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

  // A cancelled-but-not-yet-expired row still grants access (Lemon Squeezy
  // keeps it around until current_period_end -- see lib/subscriptionSync.ts),
  // so it's still "the subscription" for status/interval/manage-subscription
  // purposes. Only "expired" means there's genuinely nothing to manage.
  const hasManageableSubscription = subscription !== null && subscription.status !== "expired";
  const currentInterval: BillingInterval | null = subscription
    ? (detailsForVariant(subscription.variant_id)?.interval ?? null)
    : null;

  const [billing, setBilling] = useState<BillingInterval>(currentInterval ?? "monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(tier: Plan, interval: BillingInterval) {
    if (checkoutLoading) return;
    const key = `${tier}-${interval}`;
    setCheckoutLoading(key);
    setError(null);

    const result = await createCheckoutUrl(tier, interval);
    setCheckoutLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Billing</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your subscription plan and payment details.
        </p>
      </div>

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
          </div>
          {hasManageableSubscription && (
            <Button type="button" onClick={handleManageSubscription} loading={portalLoading}>
              Manage Subscription
            </Button>
          )}
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
              Upgrade or switch plans -- takes you to a secure Lemon Squeezy checkout.
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
            const key = `${tier.id}-${billing}`;
            const isLoading = checkoutLoading === key;

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
                    loading={isLoading}
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout(tier.id, billing)}
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
    </div>
  );
}
