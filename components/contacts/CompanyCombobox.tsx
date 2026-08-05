"use client";

import { useMemo, useRef, useState } from "react";
import { createCompany } from "@/lib/actions/companies";

type CompanyOption = { id: string; name: string };

export function CompanyCombobox({
  companies,
  defaultCompanyId,
  defaultCompanyName,
  label = "Company",
  required,
}: {
  companies: CompanyOption[];
  defaultCompanyId?: string | null;
  defaultCompanyName?: string | null;
  label?: string;
  required?: boolean;
}) {
  const [options, setOptions] = useState<CompanyOption[]>(companies);
  const [selected, setSelected] = useState<CompanyOption | null>(
    defaultCompanyId && defaultCompanyName
      ? { id: defaultCompanyId, name: defaultCompanyName }
      : null
  );
  const [query, setQuery] = useState(defaultCompanyName ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length > 0 && !exactMatch;

  function selectCompany(company: CompanyOption) {
    setSelected(company);
    setQuery(company.name);
    setOpen(false);
    setCreateError(null);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setOpen(false);
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);

    const formData = new FormData();
    formData.set("name", name);
    const result = await createCompany(formData);
    setCreating(false);

    if (result.error) {
      setCreateError(result.error);
      return;
    }
    if (result.company) {
      setOptions((prev) => [...prev, result.company!]);
      selectCompany(result.company);
    }
  }

  function handleBlur() {
    // Delay closing so a click on an option/create button registers first.
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      // Nothing was picked or created — don't leave unsaved text behind.
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
      <label htmlFor="company_search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input type="hidden" name="company_id" value={selected?.id ?? ""} />
      <input type="hidden" name="company_name" value={selected?.name ?? ""} />
      <input
        id="company_search"
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
        placeholder="Search or create a company..."
        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {selected && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSelection}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              No company
            </button>
          )}

          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectCompany(option)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                selected?.id === option.id
                  ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {option.name}
            </button>
          ))}

          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No companies yet.</p>
          )}

          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={creating}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-accent-hover hover:bg-accent/5 disabled:opacity-60 dark:border-slate-700 dark:text-accent dark:hover:bg-accent/10"
            >
              {creating ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              ) : (
                "+"
              )}
              Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}

      {createError && (
        <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>
      )}
    </div>
  );
}
