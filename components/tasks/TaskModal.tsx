"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AssigneeCombobox } from "./AssigneeCombobox";
import { RichTextEditor } from "./RichTextEditor";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { TASK_PRIORITIES, TASK_STATUSES } from "./statuses";
import type { Project, Task, WorkspaceTeamMember } from "@/lib/types";

export type NewTaskPrefill = {
  assignedToId?: string | null;
  assignedToName?: string | null;
  startDate?: string;
  dueDate?: string;
};

export function TaskModal({
  open,
  onClose,
  task,
  projects,
  members,
  currentUserId,
  newTaskDefaultAssignee = "current-user",
  newTaskPrefill,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  projects: Pick<Project, "id" | "name">[];
  members: WorkspaceTeamMember[];
  currentUserId: string;
  // My Tasks defaults a brand-new task to the logged-in user; Team Board
  // (global, not "mine") leaves it unassigned unless picked manually.
  newTaskDefaultAssignee?: "current-user" | "unassigned";
  // Workload grid-cell clicks pass an explicit assignee/date pair that wins
  // over newTaskDefaultAssignee -- e.g. clicking Ayesha's Aug 15 cell.
  newTaskPrefill?: NewTaskPrefill;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!task;

  const currentUser = useMemo(
    () => members.find((m) => m.user_id === currentUserId) ?? null,
    [members, currentUserId]
  );
  const defaultAssigneeId = task
    ? task.assigned_to
    : newTaskPrefill
      ? (newTaskPrefill.assignedToId ?? null)
      : newTaskDefaultAssignee === "unassigned"
        ? null
        : (currentUser?.user_id ?? currentUserId);
  const defaultAssigneeName = task
    ? task.assignee?.full_name ?? null
    : newTaskPrefill
      ? (newTaskPrefill.assignedToName ?? null)
      : newTaskDefaultAssignee === "unassigned"
        ? null
        : (currentUser?.full_name ?? currentUser?.email ?? null);
  const defaultStartDate = task?.start_date ?? newTaskPrefill?.startDate ?? "";
  const defaultDueDate = task?.due_date ?? newTaskPrefill?.dueDate ?? "";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateTask(task!.id, formData)
        : await createTask(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit task" : "Add task"}>
      <form key={task?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input label="Title" name="title" defaultValue={task?.title} required />

        <RichTextEditor label="Description" name="description" defaultValue={task?.description} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Project
            </label>
            <select
              id="project_id"
              name="project_id"
              defaultValue={task?.project_id ?? ""}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">No project linked</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <AssigneeCombobox
            members={members}
            defaultAssigneeId={defaultAssigneeId}
            defaultAssigneeName={defaultAssigneeName}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={task?.status ?? "todo"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={task?.priority ?? "medium"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Start date" name="start_date" type="date" defaultValue={defaultStartDate} />
          <Input label="Due date" name="due_date" type="date" defaultValue={defaultDueDate} />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
