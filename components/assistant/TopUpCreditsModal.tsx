"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createCreditTopUpCheckoutUrl } from "@/lib/actions/aiCreditsTopUp";
import { getEnabledPaymentGateways, type PaymentGatewaysEnabled } from "@/lib/actions/paymentGateways";
import { TOPUP_MIN_CREDITS, TOPUP_MAX_CREDITS, TOPUP_CENTS_PER_CREDIT, isValidTopUpAmount } from "@/lib/aiCreditsCore";

// Celaris Improvements Phase 3: mirrors BillingTab.tsx's "Choose a payment
// method" gateway modal (Safepay card + Lemon Squeezy card, side by side)
// rather than inventing a new modal layout, per the "reuse existing
// checkout flow" instruction. The one addition that modal doesn't need is
// the credit-amount input, since a top-up (unlike a plan tier) has no
// fixed price.
//
// Gateway visibility: reads the admin-controlled toggle via
// getEnabledPaymentGateways() -- the same server action BillingTab.tsx's
// gateway modal reads, so both modals stay in sync with one setting.
// Fails safe to the same {lemonsqueezy: true, safepay: false} default the
// setting itself defaults to (lib/paymentGateways.ts) while loading or on
// a fetch error, rather than briefly showing a gateway that's actually
// disabled.
const DEFAULT_GATEWAYS: PaymentGatewaysEnabled = { lemonsqueezy: true, safepay: false };

const STEP = 500;

function formatUsd(credits: number): string {
  return ((credits * TOPUP_CENTS_PER_CREDIT) / 100).toFixed(2);
}

export function TopUpCreditsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [credits, setCredits] = useState(TOPUP_MIN_CREDITS);
  const [loadingGateway, setLoadingGateway] = useState<"lemonsqueezy" | "safepay" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gateways, setGateways] = useState<PaymentGatewaysEnabled>(DEFAULT_GATEWAYS);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getEnabledPaymentGateways().then((result) => {
      if (!cancelled) setGateways(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const amountValid = isValidTopUpAmount(credits);

  function handleClose() {
    if (loadingGateway !== null) return;
    setError(null);
    onClose();
  }

  function adjust(delta: number) {
    setCredits((prev) => Math.min(TOPUP_MAX_CREDITS, Math.max(TOPUP_MIN_CREDITS, prev + delta)));
  }

  async function handleCheckout(gateway: "lemonsqueezy" | "safepay") {
    if (loadingGateway || !amountValid) return;
    setLoadingGateway(gateway);
    setError(null);

    const result = await createCreditTopUpCheckoutUrl(credits, gateway);
    setLoadingGateway(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (gateway === "lemonsqueezy") {
      // New tab, same as BillingTab's LS plan checkout -- this page stays
      // open behind it so the user can come back once payment completes.
      window.open(result.url, "_blank", "noopener,noreferrer");
      onClose();
    } else {
      // Real redirect, same as BillingTab's Safepay checkout -- Safepay's
      // hosted checkout needs to own the top-level navigation for its
      // redirect_url/cancel_url round trip.
      window.location.href = result.url;
    }
  }

  if (!open) return null;

  return (
    <Modal open onClose={handleClose} title="Purchase AI Credits">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Purchased credits never expire, and are only used once your monthly allowance runs out.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Credits ({TOPUP_MIN_CREDITS.toLocaleString()}–{TOPUP_MAX_CREDITS.toLocaleString()})
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjust(-STEP)}
              disabled={loadingGateway !== null || credits <= TOPUP_MIN_CREDITS}
              aria-label="Decrease credits"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              &minus;
            </button>
            <input
              type="number"
              value={credits}
              min={TOPUP_MIN_CREDITS}
              max={TOPUP_MAX_CREDITS}
              step={STEP}
              disabled={loadingGateway !== null}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) setCredits(next);
              }}
              onBlur={() => setCredits((prev) => Math.min(TOPUP_MAX_CREDITS, Math.max(TOPUP_MIN_CREDITS, Math.round(prev))))}
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => adjust(STEP)}
              disabled={loadingGateway !== null || credits >= TOPUP_MAX_CREDITS}
              aria-label="Increase credits"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              +
            </button>
            <span className="ml-auto text-sm font-semibold text-slate-900 dark:text-slate-100">${formatUsd(credits)}</span>
          </div>
          {!amountValid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Choose between {TOPUP_MIN_CREDITS.toLocaleString()} and {TOPUP_MAX_CREDITS.toLocaleString()} credits.
            </p>
          )}
        </div>

        {gateways.safepay && (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Safepay</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pay in PKR via local cards, bank transfer, or wallets.</p>
            <Button
              type="button"
              variant="secondary"
              loading={loadingGateway === "safepay"}
              disabled={loadingGateway !== null || !amountValid}
              onClick={() => handleCheckout("safepay")}
            >
              Pay with Safepay (PKR)
            </Button>
          </div>
        )}

        {gateways.lemonsqueezy && (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lemon Squeezy</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">International card payments (USD).</p>
            <Button
              type="button"
              variant="secondary"
              loading={loadingGateway === "lemonsqueezy"}
              disabled={loadingGateway !== null || !amountValid}
              onClick={() => handleCheckout("lemonsqueezy")}
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

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={loadingGateway !== null} onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
