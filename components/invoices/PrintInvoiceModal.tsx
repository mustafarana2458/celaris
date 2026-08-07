"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { INVOICE_STATUSES } from "./statuses";
import { InvoiceQrCode } from "./InvoiceQrCode";
import type { Invoice, InvoiceSenderDetails } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusMap = Object.fromEntries(INVOICE_STATUSES.map((s) => [s.value, s]));

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDueDate(value: string | null) {
  if (!value) return "Due on receipt";
  return formatDate(value);
}

function formatIssuedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getPublicInvoiceUrl(token: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${baseUrl}/invoice/${token}`;
}

export function PrintInvoiceModal({
  invoice,
  senderDetails,
  onClose,
}: {
  invoice: Invoice | null;
  senderDetails: InvoiceSenderDetails | null;
  onClose: () => void;
}) {
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!invoice) {
      hasAutoPrintedRef.current = false;
      return;
    }
    if (hasAutoPrintedRef.current) return;
    hasAutoPrintedRef.current = true;

    const timer = setTimeout(() => window.print(), 250);
    return () => clearTimeout(timer);
  }, [invoice]);

  if (!invoice) return null;

  const statusInfo = statusMap[invoice.status];
  const publicUrl = getPublicInvoiceUrl(invoice.public_token);
  const items: { id: string; description: string; quantity: number; unit_price: number }[] =
    invoice.invoice_items && invoice.invoice_items.length > 0
      ? invoice.invoice_items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      : [
          {
            id: "fallback",
            description: "Invoice amount",
            quantity: 1,
            unit_price: invoice.amount,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 print:static print:bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center px-4 py-8 print:min-h-0 print:p-0">
        <div className="no-print mb-4 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Print preview</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        <div className="print-invoice w-full rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <p className="text-lg font-semibold text-slate-900">{senderDetails?.name}</p>
              {senderDetails?.address && (
                <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{senderDetails.address}</p>
              )}
              {senderDetails?.tax_number && (
                <p className="mt-1 text-xs text-slate-500">Tax ID: {senderDetails.tax_number}</p>
              )}
              {(senderDetails?.support_email || senderDetails?.phone) && (
                <p className="mt-1 text-xs text-slate-500">
                  {[senderDetails?.support_email, senderDetails?.phone].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500">Invoice {invoice.invoice_number}</p>
            </div>
            {statusInfo && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusInfo.badge}`}
              >
                {statusInfo.label}
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Bill to
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {invoice.contacts?.name || "—"}
              </p>
              {invoice.contacts?.company && (
                <p className="text-sm text-slate-600">{invoice.contacts.company}</p>
              )}
              {invoice.contacts?.email && (
                <p className="text-sm text-slate-600">{invoice.contacts.email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Issued
              </p>
              <p className="mt-1 text-sm text-slate-700">{formatIssuedDate(invoice.issued_at)}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Due
              </p>
              <p className="mt-1 text-sm text-slate-700">{formatDueDate(invoice.due_date)}</p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Unit price</th>
                  <th className="px-4 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-slate-700">{item.description}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {currency.format(item.unit_price)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-900">
                      {currency.format(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-500">Subtotal</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {currency.format(invoice.amount)}
                    </td>
                  </tr>
                  {invoice.discount > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-500">Discount</td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        -{currency.format(invoice.discount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-500">
                      Tax{invoice.tax_percent > 0 ? ` (${invoice.tax_percent}%)` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {currency.format(invoice.tax)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {currency.format(invoice.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {senderDetails?.payment_instructions && (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Payment methods / Notes
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {senderDetails.payment_instructions}
              </p>
            </div>
          )}

          <div className="mt-8 flex items-end justify-between gap-4">
            <p className="max-w-xs text-xs text-slate-400">
              Scan the QR code to view this invoice online at any time.
            </p>
            <InvoiceQrCode value={publicUrl} size={96} />
          </div>
        </div>
      </div>
    </div>
  );
}
