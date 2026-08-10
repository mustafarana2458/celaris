import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { getProjectProgress } from "@/lib/projectProgress";
import { PROJECT_STATUSES } from "./statuses";
import { PROJECT_HEALTHS } from "./healths";
import type { Project } from "@/lib/types";

const statusMap = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s]));
const healthMap = Object.fromEntries(PROJECT_HEALTHS.map((h) => [h.value, h]));

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectsTable({
  projects,
  onView,
  onEdit,
  onDelete,
  canEdit,
}: {
  projects: Project[];
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Dates</th>
            <th className="px-4 py-3">Budget</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {projects.map((project) => {
            const progress = getProjectProgress(project.milestones ?? [], project.tasks ?? []);
            const statusInfo = statusMap[project.status];
            const healthInfo = project.health ? healthMap[project.health] : null;
            const start = formatDate(project.start_date);
            const due = formatDate(project.due_date);

            return (
              <tr key={project.id} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="hover:text-accent-hover dark:hover:text-accent"
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{project.companies?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      healthInfo?.badge ?? statusInfo?.badge ?? ""
                    }`}
                  >
                    {healthInfo?.label ?? statusInfo?.label ?? project.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{progress.percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {start || due ? `${start ?? "—"} → ${due ?? "—"}` : "—"}
                </td>
                <td className="px-4 py-3">{project.budget != null ? currency.format(project.budget) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <RowActionsMenu
                      ariaLabel="Project actions"
                      actions={[
                        { label: "View", onClick: () => onView(project), icon: Eye },
                        ...(canEdit
                          ? [
                              { label: "Edit", onClick: () => onEdit(project), icon: Pencil },
                              { label: "Delete", onClick: () => onDelete(project), icon: Trash2, destructive: true },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
