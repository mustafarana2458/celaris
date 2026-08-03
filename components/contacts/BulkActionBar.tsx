"use client";

import { useMemo, useState } from "react";
import { tagColor } from "@/lib/tagColors";

export function BulkActionBar({
  count,
  tagSuggestions,
  onDelete,
  onExport,
  onApplyTag,
  pending,
  error,
}: {
  count: number;
  /** Omit to hide the "Add tag" control (e.g. for entities with no tag support, like Companies). */
  tagSuggestions?: string[];
  onDelete: () => void;
  /** Omit to hide the "Export to CSV" control. */
  onExport?: () => void;
  onApplyTag?: (tagName: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagValue, setTagValue] = useState("");

  const filteredSuggestions = useMemo(() => {
    const q = tagValue.trim().toLowerCase();
    return (tagSuggestions ?? []).filter((t) => !q || t.toLowerCase().includes(q)).slice(0, 6);
  }, [tagSuggestions, tagValue]);

  function applyTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || !onApplyTag) return;
    onApplyTag(trimmed);
    setTagValue("");
    setTagPickerOpen(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 dark:border-accent/30 dark:bg-accent/10 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {count} selected
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {onApplyTag && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setTagPickerOpen((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Add tag
            </button>

            {tagPickerOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                <input
                  autoFocus
                  type="text"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyTag(tagValue);
                    }
                  }}
                  placeholder="Type a tag..."
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                {filteredSuggestions.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applyTag(s)}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${tagColor(s).dot}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => applyTag(tagValue)}
                  disabled={!tagValue.trim()}
                  className="mt-1.5 w-full rounded-lg bg-accent px-2.5 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply to {count} contact{count === 1 ? "" : "s"}
                </button>
              </div>
            )}
          </div>
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Export to CSV
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Delete selected
        </button>
      </div>

      {error && (
        <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
