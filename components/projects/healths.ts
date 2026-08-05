import type { ProjectHealth } from "@/lib/types";

export const PROJECT_HEALTHS: {
  value: ProjectHealth;
  label: string;
  badge: string;
}[] = [
  { value: "on_track", label: "On Track", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  { value: "at_risk", label: "At Risk", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "delayed", label: "Delayed", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" },
];
