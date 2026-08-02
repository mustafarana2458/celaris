"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TaskModal } from "./TaskModal";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TaskCard } from "./TaskCard";
import { AiBreakdownDrawer } from "./AiBreakdownDrawer";
import { TASK_STATUSES } from "./statuses";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { Project, Task, TaskStatus } from "@/lib/types";

export function TasksPageClient({
  initialTasks,
  projects,
}: {
  initialTasks: Task[];
  projects: Pick<Project, "id" | "name">[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [breakingDown, setBreakingDown] = useState<Task | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const columns = useMemo(
    () =>
      TASK_STATUSES.map((s) => ({
        ...s,
        tasks: tasks.filter((t) => t.status === s.value),
      })),
    [tasks]
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
            {tasks.length} task{tasks.length === 1 ? "" : "s"} across your board.
          </p>
        </div>
        <Button onClick={openAdd}>+ Add task</Button>
      </div>

      {tasks.length === 0 ? (
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
                {col.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    moving={movingId === task.id}
                    onStatusChange={(status) => handleStatusChange(task, status)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleting(task)}
                    onBreakdown={() => setBreakingDown(task)}
                    onChecklistChanged={() => router.refresh()}
                  />
                ))}
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

      <AiBreakdownDrawer
        task={breakingDown}
        onClose={() => setBreakingDown(null)}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}
