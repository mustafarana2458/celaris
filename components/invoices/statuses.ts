import type { InvoiceStatus } from "@/lib/types";

export const INVOICE_STATUSES: {
  value: InvoiceStatus;
  label: string;
  badge: string;
}[] = [
  { value: "unpaid", label: "Unpaid", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "paid", label: "Paid", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  { value: "overdue", label: "Overdue", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" },
];
