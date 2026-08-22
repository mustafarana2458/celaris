"use server";

import { getPaymentGatewayEnabled } from "@/lib/paymentGateways";

// The ONE server action both payment modals call -- BillingTab.tsx's
// gateway-choice modal and TopUpCreditsModal.tsx -- so which gateways are
// offered is decided in exactly one place, not duplicated per modal.
// Both are "use client" components; calling a Server Action directly is
// this codebase's existing pattern for client -> server reads (same as
// createCreditTopUpCheckoutUrl / createCheckoutUrl already are).

export type PaymentGatewaysEnabled = { safepay: boolean; lemonsqueezy: boolean };

export async function getEnabledPaymentGateways(): Promise<PaymentGatewaysEnabled> {
  const [safepay, lemonsqueezy] = await Promise.all([
    getPaymentGatewayEnabled("safepay"),
    getPaymentGatewayEnabled("lemonsqueezy"),
  ]);
  return { safepay, lemonsqueezy };
}
