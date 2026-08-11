import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { taskAssigneeDisplay } from "@/lib/assignee";
import { TASK_PRIORITIES, TASK_STATUSES } from "./statuses";
import type { Task } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TasksTable({
  tasks,
  canEdit,
  onEdit,
  onDelete,
  onBreakdown,
}: {
  tasks: Task[];
  canEdit: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onBreakdown: (task: Task) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Due date</th>
            <th className="px-4 py-3">Assignee</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {tasks.map((task) => {
            const status = TASK_STATUSES.find((s) => s.value === task.status);
            const priority = TASK_PRIORITIES.find((p) => p.value === task.priority);
            const assignee = taskAssigneeDisplay(task);
            return (
              <tr key={task.id} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{task.title}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {task.projects?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {status?.label ?? task.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priority?.badge ?? ""}`}
                  >
                    {priority?.label ?? task.priority}
                  </span>
                </td>
                <td className="px-4 py-3">{formatDate(task.due_date)}</td>
                <td className="px-4 py-3">
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white ${tagColor(assignee.name).dot} ${
                          assignee.isExternal
                            ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-offset-slate-800 dark:ring-slate-500"
                            : ""
                        }`}
                      >
                        {getInitials(assignee.name)}
                      </span>
                      {assignee.name}
                      {assignee.isExternal && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                          External
                        </span>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onBreakdown(task)}
                        title="AI Breakdown"
                        aria-label="AI Breakdown"
                        className="rounded-lg px-1.5 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <RowActionsMenu
                        ariaLabel="Task actions"
                        actions={[
                          { label: "Edit", onClick: () => onEdit(task), icon: Pencil },
                          { label: "Delete", onClick: () => onDelete(task), icon: Trash2, destructive: true },
                        ]}
                      />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
