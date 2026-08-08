"use client";

import { MultiSelectFilter } from "./MultiSelectFilter";
import { buildAssigneeOptions } from "@/lib/assignee";
import { TASK_PRIORITIES } from "../statuses";
import type { Project, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export type TeamBoardFilterState = {
  assigneeIds: string[];
  projectIds: string[];
  priorities: string[];
};

export function TeamBoardFilters({
  members,
  directory,
  projects,
  filters,
  onChange,
}: {
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  projects: Pick<Project, "id" | "name">[];
  filters: TeamBoardFilterState;
  onChange: (filters: TeamBoardFilterState) => void;
}) {
  const assigneeOptions = [
    { id: "unassigned", label: "Unassigned" },
    ...buildAssigneeOptions(members, directory).map((o) => ({
      id: o.key,
      label: o.kind === "directory" ? `${o.name} (External)` : o.name,
    })),
  ];
  const projectOptions = projects.map((p) => ({ id: p.id, label: p.name }));
  const priorityOptions = TASK_PRIORITIES.map((p) => ({ id: p.value, label: p.label }));

  const activeCount = filters.assigneeIds.length + filters.projectIds.length + filters.priorities.length;

  return (
    <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-1 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <MultiSelectFilter
        label="Assignee"
        options={assigneeOptions}
        selected={filters.assigneeIds}
        onChange={(assigneeIds) => onChange({ ...filters, assigneeIds })}
      />
      <MultiSelectFilter
        label="Project"
        options={projectOptions}
        selected={filters.projectIds}
        onChange={(projectIds) => onChange({ ...filters, projectIds })}
      />
      <MultiSelectFilter
        label="Priority"
        options={priorityOptions}
        selected={filters.priorities}
        onChange={(priorities) => onChange({ ...filters, priorities })}
      />
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onChange({ assigneeIds: [], projectIds: [], priorities: [] })}
          className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
