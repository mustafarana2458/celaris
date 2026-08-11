"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import { TaskModal } from "../TaskModal";
import { DeleteTaskDialog } from "../DeleteTaskDialog";
import { TasksKanban } from "../TasksKanban";
import { AiBreakdownDrawer } from "../AiBreakdownDrawer";
import { TeamBoardFilters, type TeamBoardFilterState } from "./TeamBoardFilters";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { taskAssigneeKey } from "@/lib/assignee";
import type { Project, Task, TaskStatus, TeamMember, WorkspaceTeamMember } from "@/lib/types";

const EMPTY_FILTERS: TeamBoardFilterState = { assigneeIds: [], projectIds: [], priorities: [] };

export function TeamBoardPageClient({
  initialTasks,
  projects,
  members,
  directory,
  currentUserId,
}: {
  initialTasks: Task[];
  projects: Pick<Project, "id" | "name">[];
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  currentUserId: string;
}) {
  const router = useRouter();
  const canEdit = useCanEdit("tasks", "my_tasks");
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState<TeamBoardFilterState>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [breakingDown, setBreakingDown] = useState<Task | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.assigneeIds.length > 0) {
        if (!filters.assigneeIds.includes(taskAssigneeKey(task))) return false;
      }
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(task.project_id ?? "")) {
        return false;
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Team Board</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filteredTasks.length} of {tasks.length} task{tasks.length === 1 ? "" : "s"} across the
            workspace.
          </p>
        </div>
        {canEdit && <Button onClick={openAdd}>+ Add task</Button>}
      </div>

      <TeamBoardFilters
        members={members}
        directory={directory}
        projects={projects}
        filters={filters}
        onChange={setFilters}
      />

      {statusError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t move that task: {statusError}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add the first task for your team to start filling up the board.
          </p>
          {canEdit && (
            <Button onClick={openAdd} className="mt-1">
              + Add task
            </Button>
          )}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks match these filters</p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-sm font-medium text-accent-hover hover:underline dark:text-accent"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <TasksKanban
          tasks={filteredTasks}
          movingId={movingId}
          canEdit={canEdit}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
          onDelete={setDeleting}
          onBreakdown={setBreakingDown}
          onChecklistChanged={() => router.refresh()}
        />
      )}

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        task={editing}
        projects={projects}
        members={members}
        directory={directory}
        currentUserId={currentUserId}
        newTaskDefaultAssignee="unassigned"
        onSaved={handleSaved}
      />

      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />

      <AiBreakdownDrawer
        task={breakingDown}
        onClose={() => setBreakingDown(null)}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}
