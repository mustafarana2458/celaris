"use client";

import { useMemo, useRef, useState } from "react";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { buildAssigneeOptions, parseAssigneeKey, type AssigneeOption } from "@/lib/assignee";
import type { TeamMember, WorkspaceTeamMember } from "@/lib/types";

export function AssigneeCombobox({
  members,
  directory,
  defaultAssigneeKey,
  defaultAssigneeName,
}: {
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  defaultAssigneeKey?: string | null;
  defaultAssigneeName?: string | null;
}) {
  const options = useMemo(() => buildAssigneeOptions(members, directory), [members, directory]);

  const [selected, setSelected] = useState<AssigneeOption | null>(() => {
    const ref = parseAssigneeKey(defaultAssigneeKey);
    if (!ref || !defaultAssigneeName) return null;
    return { key: `${ref.kind}:${ref.id}`, id: ref.id, kind: ref.kind, name: defaultAssigneeName };
  });
  const [query, setQuery] = useState(defaultAssigneeName ?? "");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  function selectOption(option: AssigneeOption) {
    setSelected(option);
    setQuery(option.name);
    setOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setOpen(false);
  }

  function handleBlur() {
    // Delay closing so a click on an option registers first.
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      if (!selected) setQuery("");
    }, 150);
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor="assignee_search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Assignee
      </label>
      <input type="hidden" name="assigned_to" value={selected?.kind === "user" ? selected.id : ""} />
      <input
        type="hidden"
        name="assigned_to_member_id"
        value={selected?.kind === "directory" ? selected.id : ""}
      />
      <div className="relative">
        {selected && (
          <span
            className={`pointer-events-none absolute left-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[9px] font-semibold text-white ${tagColor(selected.name).dot} ${
              selected.kind === "directory" ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-slate-500" : ""
            }`}
          >
            {getInitials(selected.name)}
          </span>
        )}
        <input
          id="assignee_search"
          type="text"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search team members..."
          className={`w-full rounded-lg border border-slate-200 py-2.5 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${selected ? "pl-9" : "pl-3.5"}`}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {selected && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSelection}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Unassigned
            </button>
          )}

          {filtered.map((option) => (
            <button
              key={option.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(option)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                selected?.key === option.key
                  ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${tagColor(option.name).dot} ${
                  option.kind === "directory" ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-slate-500" : ""
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
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No members found.</p>
          )}
        </div>
      )}
    </div>
  );
}
