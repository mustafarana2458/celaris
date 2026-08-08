"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { buildAssigneeOptions, type AssigneeOption } from "@/lib/assignee";
import { addDepartmentMember } from "@/lib/actions/departments";
import type { TeamMember, WorkspaceTeamMember } from "@/lib/types";

export function AddDepartmentMemberSearch({
  departmentId,
  workspaceMembers,
  directory,
  existingKeys,
  onAdded,
}: {
  departmentId: string;
  workspaceMembers: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  existingKeys: Set<string>;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Already-a-member entries are excluded outright rather than shown
  // disabled -- keeps the list to just what's actually addable.
  const options = useMemo(
    () => buildAssigneeOptions(workspaceMembers, directory).filter((o) => !existingKeys.has(o.key)),
    [workspaceMembers, directory, existingKeys]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
  }

  function handleAdd(option: AssigneeOption) {
    setError(null);
    setAddingKey(option.key);
    startTransition(async () => {
      const result = await addDepartmentMember(departmentId, option.key);
      setAddingKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setQuery("");
      setOpen(false);
      onAdded();
    });
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      <input
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search active members or directory profiles to add..."
        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {filtered.map((option) => (
            <button
              key={option.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd(option)}
              disabled={isPending && addingKey === option.key}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${tagColor(option.name).dot} ${
                  option.kind === "directory"
                    ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-slate-500"
                    : ""
                }`}
              >
                {getInitials(option.name)}
              </span>
              <span className="flex-1 truncate">{option.name}</span>
              {option.kind === "directory" && (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  External
                </span>
              )}
              {addingKey === option.key && isPending && (
                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">Adding...</span>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
              {options.length === 0 ? "Everyone is already in this department." : "No members found."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
