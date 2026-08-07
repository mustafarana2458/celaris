import type { RecurringProfileFrequency, RecurringProfileStatus } from "@/lib/types";

export const RECURRING_PROFILE_STATUSES: {
  value: RecurringProfileStatus;
  label: string;
  badge: string;
}[] = [
  { value: "active", label: "Active", badge: "bg-emerald-600 text-white dark:bg-emerald-500" },
  {
    value: "paused",
    label: "Paused",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  },
];

export const RECURRING_PROFILE_FREQUENCIES: { value: RecurringProfileFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];
