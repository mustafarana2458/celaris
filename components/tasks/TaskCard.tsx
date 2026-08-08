"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { TaskChecklist } from "./TaskChecklist";
import { TASK_PRIORITIES } from "./statuses";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { taskAssigneeDisplay } from "@/lib/assignee";
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
  onEdit,
  onDelete,
  onBreakdown,
  onChecklistChanged,
}: {
  task: Task;
  moving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onBreakdown: () => void;
  onChecklistChanged: () => void;
}) {
  const overdue = isOverdue(task.due_date, task.status);
  const assignee = taskAssigneeDisplay(task);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.4 : moving ? 0.6 : 1,
      }}
      className="relative rounded-xl border border-slate-200 p-3 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
    >
      {/* Kept outside the drag-listener region below so a click here never gets
          swallowed as a drag start. */}
      <div className="absolute right-2 top-2 z-10">
        <RowActionsMenu
          ariaLabel="Task actions"
          actions={[
            { label: "Edit", onClick: onEdit, icon: Pencil },
            { label: "Delete", onClick: onDelete, icon: Trash2, destructive: true },
          ]}
        />
      </div>

      <div
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2 pr-6">
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
            {overdue && "🔴 "}Due {formatDate(task.due_date)}
          </p>
        )}
      </div>

      <TaskChecklist taskId={task.id} subtasks={task.subtasks ?? []} onChanged={onChecklistChanged} />

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={onBreakdown}
          title="AI Breakdown"
          aria-label="AI Breakdown"
          className="rounded-lg px-1.5 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
        >
          <span aria-hidden>✨</span>
        </button>
        {assignee && (
          <span
            title={`Assigned to ${assignee.name}${assignee.isExternal ? " (External)" : ""}`}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tagColor(assignee.name).dot} ${
              assignee.isExternal
                ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-offset-slate-800 dark:ring-slate-500"
                : ""
            }`}
          >
            {getInitials(assignee.name)}
          </span>
        )}
      </div>
    </div>
  );
}
