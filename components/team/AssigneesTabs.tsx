"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { buildAssigneeOptions, type AssigneeOption } from "@/lib/assignee";
import type { Department, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export type AssigneeJunctionRow = { id: string; user_id: string | null; team_member_id: string | null };
export type DepartmentJunctionRow = { id: string; department_id: string };

type ActionResult = { error?: string };

const selectClass =
  "rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

// Individuals + Departments multi-assignment for a project or deal. Purely
// additive tagging in this phase -- selecting people/departments here has
// no effect on who can see the project/deal (that's Part 2b). Generic over
// which entity it's attached to via the four action callbacks, so both
// Projects and Deals reuse this one component instead of two near-copies.
export function AssigneesTabs({
  entityId,
  members,
  directory,
  departments,
  assigneeRows,
  departmentRows,
  loading,
  onAddAssignee,
  onRemoveAssignee,
  onAddDepartment,
  onRemoveDepartment,
  onChanged,
}: {
  entityId: string;
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  departments: Department[];
  assigneeRows: AssigneeJunctionRow[];
  departmentRows: DepartmentJunctionRow[];
  loading?: boolean;
  onAddAssignee: (entityId: string, assigneeKey: string) => Promise<ActionResult>;
  onRemoveAssignee: (id: string, entityId: string) => Promise<ActionResult>;
  onAddDepartment: (entityId: string, departmentId: string) => Promise<ActionResult>;
  onRemoveDepartment: (id: string, entityId: string) => Promise<ActionResult>;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"individuals" | "departments">("individuals");
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const individualOptions = useMemo(() => buildAssigneeOptions(members, directory), [members, directory]);
  const individualsByKey = useMemo(
    () => new Map(individualOptions.map((o) => [o.key, o])),
    [individualOptions]
  );
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const existingAssigneeKeys = new Set(
    assigneeRows
      .map((r) => (r.user_id ? `user:${r.user_id}` : r.team_member_id ? `directory:${r.team_member_id}` : null))
      .filter((key): key is string => key !== null)
  );
  const existingDepartmentIds = new Set(departmentRows.map((r) => r.department_id));

  const addableIndividuals = individualOptions.filter((o) => !existingAssigneeKeys.has(o.key));
  const addableDepartments = departments.filter((d) => !existingDepartmentIds.has(d.id));

  function handleAddAssignee(option: AssigneeOption) {
    setError(null);
    setBusyKey(option.key);
    startTransition(async () => {
      const result = await onAddAssignee(entityId, option.key);
      setBusyKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  function handleRemoveAssignee(row: AssigneeJunctionRow) {
    setError(null);
    setBusyKey(row.id);
    startTransition(async () => {
      const result = await onRemoveAssignee(row.id, entityId);
      setBusyKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  function handleAddDepartment(department: Department) {
    setError(null);
    setBusyKey(department.id);
    startTransition(async () => {
      const result = await onAddDepartment(entityId, department.id);
      setBusyKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  function handleRemoveDepartment(row: DepartmentJunctionRow) {
    setError(null);
    setBusyKey(row.id);
    startTransition(async () => {
      const result = await onRemoveDepartment(row.id, entityId);
      setBusyKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignees</label>

      <div className="flex w-fit rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
        {(["individuals", "departments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">Loading assignees...</p>
      ) : tab === "individuals" ? (
        <div className="flex flex-col gap-2">
          {assigneeRows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assigneeRows.map((row) => {
                const key = row.user_id ? `user:${row.user_id}` : `directory:${row.team_member_id}`;
                const option = individualsByKey.get(key);
                const name = option?.name ?? "Unknown";
                const isExternal = row.team_member_id !== null;
                return (
                  <span
                    key={row.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-1 pr-2 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white ${tagColor(name).dot} ${
                        isExternal
                          ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-slate-500"
                          : ""
                      }`}
                    >
                      {getInitials(name)}
                    </span>
                    {name}
                    {isExternal && (
                      <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        External
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(row)}
                      disabled={isPending && busyKey === row.id}
                      aria-label={`Remove ${name}`}
                      className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:text-slate-500 dark:hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <select
            value=""
            onChange={(e) => {
              const option = individualsByKey.get(e.target.value);
              if (option) handleAddAssignee(option);
            }}
            disabled={isPending}
            className={selectClass}
          >
            <option value="">+ Add individual...</option>
            {addableIndividuals.map((o) => (
              <option key={o.key} value={o.key}>
                {o.kind === "directory" ? `${o.name} (External)` : o.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {departmentRows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {departmentRows.map((row) => {
                const department = departmentsById.get(row.department_id);
                return (
                  <span
                    key={row.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  >
                    {department?.department_name ?? "Unknown"}
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(row)}
                      disabled={isPending && busyKey === row.id}
                      aria-label={`Remove ${department?.department_name ?? "department"}`}
                      className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:text-slate-500 dark:hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <select
            value=""
            onChange={(e) => {
              const department = departmentsById.get(e.target.value);
              if (department) handleAddDepartment(department);
            }}
            disabled={isPending}
            className={selectClass}
          >
            <option value="">+ Add department...</option>
            {addableDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.department_name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
