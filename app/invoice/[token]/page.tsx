import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { InvoiceQrCode } from "@/components/invoices/InvoiceQrCode";

export const dynamic = "force-dynamic";

type PublicInvoice = {
  id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  due_date: string | null;
  issued_at: string;
  contact_name: string | null;
  contact_company: string | null;
  contact_email: string | null;
  workspace_name: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STATUS_STYLES: Record<string, string> = {
  unpaid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-rose-50 text-rose-700",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function PublicInvoicePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_invoice_by_token", { token: params.token });
  const invoice = data as PublicInvoice | null;

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">Invoice not found</p>
          <p className="mt-2 text-sm text-slate-500">
            This link is invalid or the invoice is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const baseUrl = await getBaseUrl();
  const publicUrl = `${baseUrl}/invoice/${params.token}`;
  const statusBadge = STATUS_STYLES[invoice.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <p className="text-lg font-semibold text-slate-900">{invoice.workspace_name}</p>
            <p className="mt-1 text-sm text-slate-500">Invoice {invoice.invoice_number}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadge}`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {invoice.contact_name || "—"}
            </p>
            {invoice.contact_company && (
              <p className="text-sm text-slate-600">{invoice.contact_company}</p>
            )}
            {invoice.contact_email && (
              <p className="text-sm text-slate-600">{invoice.contact_email}</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Issued</p>
            <p className="mt-1 text-sm text-slate-700">{formatDate(invoice.issued_at)}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Due</p>
            <p className="mt-1 text-sm text-slate-700">{formatDate(invoice.due_date)}</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-500">Amount</td>
                <td className="px-4 py-3 text-right text-slate-900">
                  {currency.format(invoice.amount)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-500">Tax</td>
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

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-slate-100 pt-6">
          <InvoiceQrCode value={publicUrl} size={112} />
          <p className="text-xs text-slate-400">Scan to open this invoice on another device</p>
        </div>
      </div>
    </div>
  );
}
