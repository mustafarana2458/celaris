"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TaskModal } from "./TaskModal";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TasksKanban } from "./TasksKanban";
import { TasksTable } from "./TasksTable";
import { AiBreakdownDrawer } from "./AiBreakdownDrawer";
import { updateTaskStatus } from "@/lib/actions/tasks";
import type { Project, Task, TaskStatus, TaskView, WorkspaceTeamMember } from "@/lib/types";

export function TasksPageClient({
  initialTasks,
  projects,
  members,
  currentUserId,
}: {
  initialTasks: Task[];
  projects: Pick<Project, "id" | "name">[];
  members: WorkspaceTeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<TaskView>("kanban");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [breakingDown, setBreakingDown] = useState<Task | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

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
    setStatusError(null);
    const previousStatus = task.status;
    setMovingId(task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));

    const result = await updateTaskStatus(task.id, status);
    setMovingId(null);
    if (result.error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t)));
      setStatusError(result.error);
      return;
    }
    router.refresh();
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {(["kanban", "list"] as TaskView[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === mode
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={openAdd}>+ Add task</Button>
        </div>
      </div>

      {statusError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t move that task: {statusError}
        </div>
      )}

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
      ) : view === "kanban" ? (
        <TasksKanban
          tasks={tasks}
          movingId={movingId}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
          onDelete={setDeleting}
          onBreakdown={setBreakingDown}
          onChecklistChanged={() => router.refresh()}
        />
      ) : (
        <TasksTable
          tasks={tasks}
          onEdit={openEdit}
          onDelete={setDeleting}
          onBreakdown={setBreakingDown}
        />
      )}

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        task={editing}
        projects={projects}
        members={members}
        currentUserId={currentUserId}
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
