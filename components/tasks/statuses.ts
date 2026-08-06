import type { TaskPriority, TaskStatus } from "@/lib/types";

export const TASK_STATUSES: {
  value: TaskStatus;
  label: string;
  column: string;
}[] = [
  { value: "todo", label: "To Do", column: "border-t-slate-400" },
  { value: "in_progress", label: "In Progress", column: "border-t-blue-400" },
  { value: "in_review", label: "In Review", column: "border-t-indigo-400" },
  { value: "done", label: "Done", column: "border-t-emerald-400" },
];

export const TASK_PRIORITIES: {
  value: TaskPriority;
  label: string;
  badge: string;
}[] = [
  { value: "low", label: "Low", badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  { value: "medium", label: "Medium", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  { value: "high", label: "High", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "urgent", label: "Urgent", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" },
];
