"use client";

import { Button } from "@/components/ui/Button";
import { ComingSoonToast, useComingSoonToast } from "./ComingSoonToast";

// All figures below are placeholder/sample data -- this screen has no real
// Stripe wiring yet (see the boss's Group 4/5 note: UI-only, buttons just
// surface the "coming soon" toast instead of doing anything).
const PLAN = {
  name: "Pro Plan",
  cycle: "Monthly",
  amount: "$49.00",
  nextBillingDate: "September 16, 2026",
};

const PAYMENT_METHOD = {
  brand: "Visa",
  last4: "4242",
  expiry: "12/2027",
};

const BILLING_HISTORY = [
  { date: "Aug 16, 2026", invoiceNumber: "INV-2026-0008", amount: "$49.00", status: "Paid" },
  { date: "Jul 16, 2026", invoiceNumber: "INV-2026-0007", amount: "$49.00", status: "Paid" },
  { date: "Jun 16, 2026", invoiceNumber: "INV-2026-0006", amount: "$49.00", status: "Paid" },
];

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0 4-4m-4 4-4-4M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

function CardIcon() {
  return (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-[#1A1F71] text-xs font-bold italic tracking-wide text-white">
      VISA
    </div>
  );
}

export function BillingTab() {
  const { message, showToast } = useComingSoonToast();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Billing</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your subscription plan, payment method, and invoices.
        </p>
      </div>

      <div className="rounded-2xl border border-accent bg-white p-6 ring-2 ring-accent/20 dark:bg-slate-800">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{PLAN.name}</h3>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent-hover dark:bg-accent/15 dark:text-accent">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current plan</p>
          </div>
          <Button type="button" onClick={() => showToast("Subscription management coming soon.")}>
            Manage Subscription
          </Button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3 dark:border-slate-700">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Billing cycle
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{PLAN.cycle}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Next billing date
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {PLAN.nextBillingDate}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Amount due
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{PLAN.amount}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Payment Method</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The card used for your subscription charges.
        </p>

        <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <CardIcon />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {PAYMENT_METHOD.brand} ending in {PAYMENT_METHOD.last4}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Expires {PAYMENT_METHOD.expiry}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => showToast("Payment method updates coming soon.")}
          >
            Update Payment Method
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Billing History</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your past invoices and receipts.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Invoice Number</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pl-4 text-right font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {BILLING_HISTORY.map((row) => (
                <tr key={row.invoiceNumber}>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{row.date}</td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                    {row.invoiceNumber}
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{row.amount}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-emerald-500">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      type="button"
                      onClick={() => showToast("Receipt downloads coming soon.")}
                      aria-label={`Download receipt for ${row.invoiceNumber}`}
                      className="inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    >
                      <DownloadIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ComingSoonToast message={message} />
    </div>
  );
}
