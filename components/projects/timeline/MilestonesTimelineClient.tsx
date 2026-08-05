"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProjectsTabs } from "@/components/projects/ProjectsTabs";
import { GanttTimeline } from "./GanttTimeline";
import { AddMasterMilestoneModal } from "./AddMasterMilestoneModal";
import type { Milestone, Project, WorkspaceTeamMember } from "@/lib/types";

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";

export function MilestonesTimelineClient({
  projects,
  milestones,
  members,
  loadError,
}: {
  projects: Pick<Project, "id" | "name">[];
  milestones: Milestone[];
  members: WorkspaceTeamMember[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);

  const visibleProjects = useMemo(
    () => (selectedProjectId === "all" ? projects : projects.filter((p) => p.id === selectedProjectId)),
    [projects, selectedProjectId]
  );

  const rows = useMemo(
    () =>
      visibleProjects.map((p) => ({
        id: p.id,
        name: p.name,
        milestones: milestones.filter((m) => m.project_id === p.id),
      })),
    [visibleProjects, milestones]
  );

  const totalMilestones = rows.reduce((sum, r) => sum + r.milestones.length, 0);

  function handleSaved() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectsTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Milestones & Timeline</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A cross-project roadmap of every upcoming deadline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className={selectClass}
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setAddOpen(true)}>+ Add Milestone</Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t load the timeline: {loadError}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No active projects yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Once you have an active or on-hold project, its milestones will show up here.
          </p>
        </div>
      ) : totalMilestones === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No milestones yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add your first milestone to start building the roadmap.
          </p>
          <Button onClick={() => setAddOpen(true)} className="mt-1">
            + Add Milestone
          </Button>
        </div>
      ) : (
        <GanttTimeline rows={rows} />
      )}

      <AddMasterMilestoneModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        projects={projects}
        members={members}
        onSaved={handleSaved}
      />
    </div>
  );
}
