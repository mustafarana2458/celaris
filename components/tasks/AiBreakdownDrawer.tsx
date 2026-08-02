"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { breakdownTask } from "@/lib/actions/tasks";
import { createSubtask, createSubtasksBulk } from "@/lib/actions/subtasks";
import type { Task } from "@/lib/types";

export function AiBreakdownDrawer({
  task,
  onClose,
  onAdded,
}: {
  task: Task | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const open = !!task;
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setProposals([]);
    setHasGenerated(false);
    setError(null);
    setAddingAll(false);
    setAddingIndex(null);
    setAddedCount(0);
  }, [task?.id, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleGenerate() {
    if (!task) return;
    setLoading(true);
    setError(null);
    const result = await breakdownTask(task.id);
    setLoading(false);
    setHasGenerated(true);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setProposals(result.titles ?? []);
  }

  async function handleAddOne(index: number) {
    if (!task) return;
    const title = proposals[index];
    setAddingIndex(index);
    setError(null);
    const result = await createSubtask(task.id, title);
    setAddingIndex(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProposals((prev) => prev.filter((_, i) => i !== index));
    setAddedCount((n) => n + 1);
    onAdded();
  }

  function handleDismiss(index: number) {
    setProposals((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddAll() {
    if (!task || proposals.length === 0) return;
    setAddingAll(true);
    setError(null);
    const result = await createSubtasksBulk(task.id, proposals);
    setAddingAll(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAddedCount((n) => n + proposals.length);
    setProposals([]);
    onAdded();
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity dark:bg-slate-950/60 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-slate-800 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden>✨</span>
            {task?.title ?? "AI Breakdown"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Let AI split this task into a checklist of small, actionable sub-tasks you can preview
            before adding.
          </p>

          <Button type="button" onClick={handleGenerate} disabled={loading}>
            {hasGenerated ? "Regenerate" : "Generate breakdown"}
          </Button>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 py-10 dark:bg-slate-700/40">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Breaking it down...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && hasGenerated && !error && proposals.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {proposals.length} suggested sub-task{proposals.length === 1 ? "" : "s"}
                </p>
                <Button type="button" variant="secondary" onClick={handleAddAll} disabled={addingAll}>
                  {addingAll ? "Adding..." : "Add all"}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {proposals.map((title, index) => (
                  <div
                    key={`${title}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{title}</span>
                    <button
                      type="button"
                      onClick={() => handleAddOne(index)}
                      disabled={addingIndex === index || addingAll}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 disabled:opacity-50 dark:text-accent dark:hover:bg-accent/15"
                    >
                      {addingIndex === index ? "Adding..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(index)}
                      aria-label="Dismiss suggestion"
                      className="shrink-0 rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && hasGenerated && !error && proposals.length === 0 && addedCount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Added {addedCount} sub-task{addedCount === 1 ? "" : "s"}. Generate again for more.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
