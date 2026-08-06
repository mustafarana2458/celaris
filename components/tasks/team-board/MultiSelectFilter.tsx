"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type MultiSelectOption = { id: string; label: string };

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          selected.length > 0
            ? "border-accent/40 bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-700"
            >
              Clear all
            </button>
          )}
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => toggle(option.id)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
              />
              {option.label}
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No options.</p>
          )}
        </div>
      )}
    </div>
  );
}
