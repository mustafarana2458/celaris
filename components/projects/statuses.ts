import type { ProjectStatus } from "@/lib/types";

export const PROJECT_STATUSES: {
  value: ProjectStatus;
  label: string;
  badge: string;
}[] = [
  { value: "active", label: "Active", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  { value: "on_hold", label: "On hold", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "completed", label: "Completed", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
];
