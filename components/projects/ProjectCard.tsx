import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { tagColor } from "@/lib/tagColors";
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

export function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
  canEdit,
}: {
  project: Project;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const progress = getProjectProgress(project.milestones ?? [], project.tasks ?? []);
  const statusInfo = statusMap[project.status];
  // Health is optional -- when it hasn't been set, fall back to the status
  // pill so a project is never left with no badge at all.
  const healthInfo = project.health ? healthMap[project.health] : null;
  const clientName = project.companies?.name;
  const logoUrl = project.companies?.logo_url;
  // Avatar identity is the project itself, not the client -- logo when the
  // linked company has one, else a colored circle with the project's own
  // first letter. Never falls back to any user/profile identity.
  const projectInitial = project.name.trim().charAt(0).toUpperCase() || "?";
  const avatarColor = tagColor(project.name);

  const countsParts: string[] = [];
  if (progress.milestonesTotal > 0) {
    countsParts.push(`${progress.milestonesDone}/${progress.milestonesTotal} milestones`);
  }
  if (progress.tasksTotal > 0) {
    countsParts.push(`${progress.tasksDone}/${progress.tasksTotal} tasks`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                title={project.name}
                className={`flex h-full w-full items-center justify-center text-[11px] font-semibold text-white ${avatarColor.dot}`}
              >
                {projectInitial}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <Link href={`/dashboard/projects/${project.id}`} className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 hover:text-accent-hover dark:text-slate-100 dark:hover:text-accent">
                {project.name}
              </p>
            </Link>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{clientName ?? "No client linked"}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            healthInfo?.badge ?? statusInfo?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          {healthInfo?.label ?? statusInfo?.label ?? project.status}
        </span>
      </div>

      <p className="line-clamp-2 min-h-[2rem] text-xs text-slate-500 dark:text-slate-400">
        {project.description || <span className="text-slate-300 dark:text-slate-600">No description</span>}
      </p>

      <div className="mt-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span>{progress.percent}% complete</span>
          <span className="truncate">
            {countsParts.length > 0 ? countsParts.join(" · ") : "No milestones or tasks yet"}
          </span>
        </div>
      </div>

      {/* Always rendered, budget or not -- keeps every card's footer slot the
          same height so the grid doesn't jag between cards with and without
          a budget set. */}
      <div>
        <div
          className={`h-1.5 overflow-hidden rounded-full ${
            project.budget != null ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-slate-50 dark:bg-slate-700/40"
          }`}
        >
          {project.budget != null && (
            <div
              className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
              style={{ width: `${progress.percent}%` }}
            />
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
          {project.budget != null ? (
            <>
              <span>Est. spend (task-based)</span>
              <span>{currency.format((project.budget * progress.percent) / 100)} of {currency.format(project.budget)}</span>
            </>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">No budget set</span>
          )}
        </div>
      </div>

      <div className="mt-1 flex justify-end">
        <RowActionsMenu
          ariaLabel="Project actions"
          actions={[
            { label: "View", onClick: onView, icon: Eye },
            ...(canEdit
              ? [
                  { label: "Edit", onClick: onEdit, icon: Pencil },
                  { label: "Delete", onClick: onDelete, icon: Trash2, destructive: true },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
}
