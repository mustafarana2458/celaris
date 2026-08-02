"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProjectModal } from "./ProjectModal";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { MilestoneChecklist } from "./MilestoneChecklist";
import { PROJECT_STATUSES } from "./statuses";
import { TASK_PRIORITIES } from "@/components/tasks/statuses";
import { getProjectProgress } from "@/lib/projectProgress";
import type { Project, TaskStatus } from "@/lib/types";

const statusMap = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s]));
const priorityMap = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p]));

const TASK_STATUS_BADGE: Record<TaskStatus, { label: string; badge: string }> = {
  todo: { label: "To Do", badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  in_progress: {
    label: "In Progress",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
  done: {
    label: "Done",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ProjectDetailClient({ project }: { project: Project }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const milestones = project.milestones ?? [];
  const tasks = project.tasks ?? [];
  const progress = getProjectProgress(milestones, tasks);
  const statusInfo = statusMap[project.status];

  function handleEditSaved() {
    setEditOpen(false);
    router.refresh();
  }

  function handleDeleted() {
    router.push("/dashboard/projects");
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Projects", href: "/dashboard/projects" },
          { label: project.name },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{project.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
            >
              {statusInfo?.label ?? project.status}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Overall progress</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{progress.percent}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {progress.milestonesTotal > 0
              ? `${progress.milestonesDone}/${progress.milestonesTotal} milestones done`
              : "No milestones yet"}
          </span>
          <span>
            {progress.tasksTotal > 0
              ? `${progress.tasksDone}/${progress.tasksTotal} tasks done`
              : "No linked tasks yet"}
          </span>
        </div>
      </div>

      <MilestoneChecklist
        projectId={project.id}
        milestones={milestones}
        onChanged={() => router.refresh()}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Linked tasks</h2>
          <Link
            href="/dashboard/tasks"
            className="text-xs font-medium text-accent-hover hover:underline dark:text-accent"
          >
            Manage in Tasks
          </Link>
        </div>
        <div className="mt-2 flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {tasks.length === 0 ? (
            <p className="py-4 text-sm text-slate-500 dark:text-slate-400">
              No tasks linked to this project yet. Link tasks to it from the Tasks page.
            </p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 py-3">
                <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {task.title}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {formatDate(task.due_date) && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(task.due_date)}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityMap[task.priority]?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                  >
                    {priorityMap[task.priority]?.label ?? task.priority}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_BADGE[task.status].badge}`}
                  >
                    {TASK_STATUS_BADGE[task.status].label}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ProjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onSaved={handleEditSaved}
      />

      <DeleteProjectDialog
        project={deleteOpen ? project : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
