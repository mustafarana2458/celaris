import type { TaskPriority, TaskStatus } from "@/lib/types";

export const TASK_STATUSES: {
  value: TaskStatus;
  label: string;
  column: string;
}[] = [
  { value: "todo", label: "To Do", column: "border-t-slate-400" },
  { value: "in_progress", label: "In Progress", column: "border-t-blue-400" },
  { value: "done", label: "Done", column: "border-t-emerald-400" },
];

export const TASK_PRIORITIES: {
  value: TaskPriority;
  label: string;
  badge: string;
}[] = [
  { value: "low", label: "Low", badge: "bg-slate-100 text-slate-600" },
  { value: "medium", label: "Medium", badge: "bg-blue-50 text-blue-700" },
  { value: "high", label: "High", badge: "bg-amber-50 text-amber-700" },
  { value: "urgent", label: "Urgent", badge: "bg-rose-50 text-rose-700" },
];
