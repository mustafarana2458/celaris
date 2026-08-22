"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { PaymentGateway } from "@/lib/paymentGateways";

// Admin Portal Financials module: Safepay / Lemon Squeezy checkout
// visibility toggles. Same sliding-switch + confirm-modal pattern as
// components/admin/ai-engine/AiEngineClient.tsx's OpenAI fallback toggle
// -- reused directly rather than inventing a second toggle UI.

const GATEWAY_LABELS: Record<PaymentGateway, string> = {
  lemonsqueezy: "Lemon Squeezy",
  safepay: "Safepay",
};

type PendingChange = { gateway: PaymentGateway; enabled: boolean };

export function PaymentGatewayToggles({ config }: { config: Record<PaymentGateway, boolean> }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeConfirm() {
    if (submitting) return;
    setPending(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!pending || submitting) return;
    setSubmitting(true);
    setError(null);

    let json: { ok: true; noChange: boolean; enabled: boolean } | { ok: false; error: string };
    try {
      const res = await fetch("/api/admin/payments/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway: pending.gateway, enabled: pending.enabled }),
      });
      json = await res.json();
    } catch {
      json = { ok: false, error: "Could not reach the server. Try again." };
    }

    setSubmitting(false);
    if (!json.ok) {
      setError(json.error);
      return;
    }

    setEnabled((prev) => ({ ...prev, [pending.gateway]: json.enabled }));
    setPending(null);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Checkout gateway visibility</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Controls whether each gateway is offered as a checkout option in the billing/plan modal and the AI credit
        top-up modal. Both modals read this same setting -- takes effect within ~5 seconds, no redeploy.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {(["lemonsqueezy", "safepay"] as const).map((gateway) => (
          <div key={gateway} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3.5 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setPending({ gateway, enabled: !enabled[gateway] })}
              className="flex items-center justify-between gap-2 text-left"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {GATEWAY_LABELS[gateway]} -- {enabled[gateway] ? "Enabled" : "Disabled"}
              </span>
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  enabled[gateway] ? "bg-accent" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    enabled[gateway] ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
            {gateway === "safepay" && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Not live yet -- go-live with Safepay is still pending, and the one-time AI credit top-up flow has a
                separate, unresolved workspace-resolution issue (see the Phase 3 report). Enabling this only makes
                Safepay visible again in the checkout modals; it does not fix either issue. Subscription checkout via
                Safepay is unaffected by that top-up-specific gap.
              </p>
            )}
          </div>
        ))}
      </div>

      <Modal open={pending !== null} onClose={closeConfirm} title="Confirm gateway change">
        {pending && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {pending.enabled ? "Enable" : "Disable"} <strong>{GATEWAY_LABELS[pending.gateway]}</strong> as a checkout
              option? This affects the billing/plan modal and the AI credit top-up modal for every workspace
              immediately.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This change is audit-logged.</p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={closeConfirm}>
                Cancel
              </Button>
              <Button type="button" loading={submitting} onClick={handleConfirm}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
