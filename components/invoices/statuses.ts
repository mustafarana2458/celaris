import type { InvoiceStatus } from "@/lib/types";

export const INVOICE_STATUSES: {
  value: InvoiceStatus;
  label: string;
  badge: string;
}[] = [
  { value: "unpaid", label: "Unpaid", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "paid", label: "Paid", badge: "bg-emerald-600 text-white dark:bg-emerald-500" },
  { value: "overdue", label: "Overdue", badge: "bg-red-600 text-white dark:bg-red-500" },
];
