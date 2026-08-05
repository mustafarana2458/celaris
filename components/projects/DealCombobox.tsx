"use client";

import { useMemo, useRef, useState } from "react";

type DealOption = { id: string; title: string };

export function DealCombobox({
  deals,
  defaultDealId,
  defaultDealTitle,
}: {
  deals: DealOption[];
  defaultDealId?: string | null;
  defaultDealTitle?: string | null;
}) {
  const [selected, setSelected] = useState<DealOption | null>(
    defaultDealId && defaultDealTitle ? { id: defaultDealId, title: defaultDealTitle } : null
  );
  const [query, setQuery] = useState(defaultDealTitle ?? "");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) => d.title.toLowerCase().includes(q));
  }, [deals, query]);

  function selectDeal(deal: DealOption) {
    setSelected(deal);
    setQuery(deal.title);
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
      <label htmlFor="deal_search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Linked deal
      </label>
      <input type="hidden" name="deal_id" value={selected?.id ?? ""} />
      <input
        id="deal_search"
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
        placeholder="Search deals..."
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
              No deal linked
            </button>
          )}

          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectDeal(option)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                selected?.id === option.id
                  ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {option.title}
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No deals found.</p>
          )}
        </div>
      )}
    </div>
  );
}
