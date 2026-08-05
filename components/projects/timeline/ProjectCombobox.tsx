"use client";

import { useMemo, useRef, useState } from "react";

type ProjectOption = { id: string; name: string };

export function ProjectCombobox({
  projects,
  defaultProjectId,
  defaultProjectName,
}: {
  projects: ProjectOption[];
  defaultProjectId?: string | null;
  defaultProjectName?: string | null;
}) {
  const [selected, setSelected] = useState<ProjectOption | null>(
    defaultProjectId && defaultProjectName ? { id: defaultProjectId, name: defaultProjectName } : null
  );
  const [query, setQuery] = useState(defaultProjectName ?? "");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  function selectProject(project: ProjectOption) {
    setSelected(project);
    setQuery(project.name);
    setOpen(false);
  }

  function handleBlur() {
    // Delay closing so a click on an option registers first.
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      // Nothing was picked -- don't leave unsaved text behind.
      if (!selected) {
        setQuery("");
      }
    }, 150);
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor="project_search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Associated project <span className="text-red-500">*</span>
      </label>
      <input type="hidden" name="project_id" value={selected?.id ?? ""} />
      <input
        id="project_search"
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
        placeholder="Search projects..."
        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectProject(option)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                selected?.id === option.id
                  ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {option.name}
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No projects found.</p>
          )}
        </div>
      )}
    </div>
  );
}
