"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Company, ContactFilters, Tag } from "@/lib/types";

const EMPTY_FILTERS: ContactFilters = {
  tagIds: [],
  companyId: "",
  dateFrom: "",
  dateTo: "",
  missingPhone: false,
  missingCompany: false,
};

export function activeFilterCount(filters: ContactFilters): number {
  let count = 0;
  if (filters.tagIds.length > 0) count += 1;
  if (filters.companyId) count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  if (filters.missingPhone) count += 1;
  if (filters.missingCompany) count += 1;
  return count;
}

export function AdvancedFilterPopover({
  open,
  onClose,
  companies,
  tags,
  value,
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  companies: Pick<Company, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
  value: ContactFilters;
  onApply: (filters: ContactFilters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<ContactFilters>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  function toggleTag(tagId: string) {
    setDraft((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  }

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:w-80">
      <div className="flex flex-col gap-4">
        {tags.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tags</span>
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={draft.tagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter_company" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Company
          </label>
          <select
            id="filter_company"
            value={draft.companyId}
            onChange={(e) => setDraft((prev) => ({ ...prev, companyId: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Any company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Created between</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="date"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Missing data</span>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={draft.missingPhone}
              onChange={(e) => setDraft((prev) => ({ ...prev, missingPhone: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
            />
            No phone
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={draft.missingCompany}
              onChange={(e) => setDraft((prev) => ({ ...prev, missingCompany: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
            />
            No company
          </label>
        </div>

        <div className="flex justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              onClear();
            }}
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onApply(draft)}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
