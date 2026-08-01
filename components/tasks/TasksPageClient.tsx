"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TaskModal } from "./TaskModal";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TASK_PRIORITIES, TASK_STATUSES } from "./statuses";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { Project, Task, TaskStatus } from "@/lib/types";

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

export function TasksPageClient({
  initialTasks,
  projects,
}: {
  initialTasks: Task[];
  projects: Pick<Project, "id" | "name">[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      TASK_STATUSES.map((s) => ({
        ...s,
        tasks: initialTasks.filter((t) => t.status === s.value),
      })),
    [initialTasks]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    router.refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    router.refresh();
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    if (status === task.status) return;
    setMovingId(task.id);
    const result = await updateTaskStatus(task.id, status);
    setMovingId(null);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {initialTasks.length} task{initialTasks.length === 1 ? "" : "s"} across your board.
          </p>
        </div>
        <Button onClick={openAdd}>+ Add task</Button>
      </div>

      {initialTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add your first task to start tracking what needs to get done.
          </p>
          <Button onClick={openAdd} className="mt-1">
            + Add task
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => (
            <div
              key={col.value}
              className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl border-x border-b border-t-4 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${col.column}`}
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{col.label}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  {col.tasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {col.tasks.map((task) => {
                  const overdue = isOverdue(task.due_date, task.status);
                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    >
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
                        <p className={`mt-1 text-xs ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
                          Due {formatDate(task.due_date)}
                          {overdue && " · overdue"}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <select
                          value={task.status}
                          disabled={movingId === task.id}
                          onChange={(e) =>
                            handleStatusChange(task, e.target.value as TaskStatus)
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-accent disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(task)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleting(task)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {col.tasks.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        task={editing}
        projects={projects}
        onSaved={handleSaved}
      />

      <DeleteTaskDialog
        task={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
