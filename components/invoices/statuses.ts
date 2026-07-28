import type { InvoiceStatus } from "@/lib/types";

export const INVOICE_STATUSES: {
  value: InvoiceStatus;
  label: string;
  badge: string;
}[] = [
  { value: "unpaid", label: "Unpaid", badge: "bg-amber-50 text-amber-700" },
  { value: "paid", label: "Paid", badge: "bg-emerald-50 text-emerald-700" },
  { value: "overdue", label: "Overdue", badge: "bg-rose-50 text-rose-700" },
];
