"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TASK_PRIORITIES } from "../statuses";
import type { Task } from "@/lib/types";

const PRIORITY_BAR: Record<string, string> = {
  low: "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200",
  medium: "bg-blue-200 text-blue-800 dark:bg-blue-800/60 dark:text-blue-100",
  high: "bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-100",
  urgent: "bg-rose-200 text-rose-800 dark:bg-rose-800/60 dark:text-rose-100",
};

function formatShort(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WorkloadBar({
  task,
  gridColumn,
  gridRow,
  moving,
  overdue,
  onClick,
}: {
  task: Task;
  gridColumn: string;
  gridRow: number;
  moving: boolean;
  overdue: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const priorityClass = PRIORITY_BAR[task.priority] ?? PRIORITY_BAR.medium;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      title={`${task.title}${TASK_PRIORITIES.find((p) => p.value === task.priority)?.label ? ` · ${TASK_PRIORITIES.find((p) => p.value === task.priority)?.label}` : ""}${task.due_date ? ` · Due ${formatShort(task.due_date)}` : ""}`}
      style={{
        gridColumn,
        gridRow,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.4 : moving ? 0.6 : 1,
      }}
      {...listeners}
      {...attributes}
      className={`z-10 flex cursor-grab items-center gap-1 truncate rounded-md px-2 py-1 text-left text-xs font-medium touch-none active:cursor-grabbing ${priorityClass} ${overdue ? "ring-2 ring-red-500 dark:ring-red-400" : ""}`}
    >
      {overdue && <span aria-hidden>🔴</span>}
      <span className="truncate">{task.title}</span>
    </button>
  );
}
