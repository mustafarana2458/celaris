"use client";

import { TaskChecklist } from "./TaskChecklist";
import { TASK_PRIORITIES, TASK_STATUSES } from "./statuses";
import type { Task, TaskStatus } from "@/lib/types";

const priorityMap = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p]));

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(value: string | null, status: TaskStatus) {
  if (!value || status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00`) < today;
}

export function TaskCard({
  task,
  moving,
  onStatusChange,
  onEdit,
  onDelete,
  onBreakdown,
  onChecklistChanged,
}: {
  task: Task;
  moving: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onBreakdown: () => void;
  onChecklistChanged: () => void;
}) {
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityMap[task.priority]?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
        >
          {priorityMap[task.priority]?.label ?? task.priority}
        </span>
      </div>
      {task.projects?.name && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.projects.name}</p>
      )}
      {formatDate(task.due_date) && (
        <p
          className={`mt-1 text-xs ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}
        >
          Due {formatDate(task.due_date)}
          {overdue && " · overdue"}
        </p>
      )}

      <TaskChecklist taskId={task.id} subtasks={task.subtasks ?? []} onChanged={onChecklistChanged} />

      <div className="mt-3 flex items-center justify-between gap-2">
        <select
          value={task.status}
          disabled={moving}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-accent disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={onBreakdown}
            title="AI Breakdown"
            aria-label="AI Breakdown"
            className="rounded-lg px-1.5 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
          >
            <span aria-hidden>✨</span>
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
