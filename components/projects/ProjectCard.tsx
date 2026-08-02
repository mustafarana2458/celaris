import Link from "next/link";
import { getProjectProgress } from "@/lib/projectProgress";
import { PROJECT_STATUSES } from "./statuses";
import type { Project } from "@/lib/types";

const statusMap = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s]));

export function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const progress = getProjectProgress(project.milestones ?? [], project.tasks ?? []);
  const statusInfo = statusMap[project.status];

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
        <Link href={`/dashboard/projects/${project.id}`} className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 hover:text-accent-hover dark:text-slate-100 dark:hover:text-accent">
            {project.name}
          </p>
        </Link>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
        >
          {statusInfo?.label ?? project.status}
        </span>
      </div>

      {project.description && (
        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{project.description}</p>
      )}

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

      <div className="mt-1 flex justify-end gap-1">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
        >
          View
        </Link>
        <button
          onClick={onEdit}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
