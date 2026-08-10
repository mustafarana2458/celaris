"use client";

import { useEffect, useState } from "react";
import { createMilestone, deleteMilestone, toggleMilestone } from "@/lib/actions/milestones";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import type { Milestone } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function MilestoneChecklist({
  projectId,
  milestones,
  onChanged,
}: {
  projectId: string;
  milestones: Milestone[];
  onChanged: () => void;
}) {
  const canEdit = useCanEdit("projects", "milestones");
  const [items, setItems] = useState(milestones);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setItems(milestones), [milestones]);

  const done = items.filter((i) => i.is_done).length;
  const total = items.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    setError(null);
    const result = await createMilestone(projectId, title, newDueDate || null);
    setAdding(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewTitle("");
    setNewDueDate("");
    onChanged();
  }

  async function handleToggle(item: Milestone) {
    setBusyId(item.id);
    setError(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)));
    const result = await toggleMilestone(item.id, !item.is_done);
    setBusyId(null);
    if (result.error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i)));
      setError(result.error);
      return;
    }
    onChanged();
  }

  async function handleDelete(item: Milestone) {
    setBusyId(item.id);
    setError(null);
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const result = await deleteMilestone(item.id);
    setBusyId(null);
    if (result.error) {
      setItems(previous);
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Milestones</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {total > 0 ? `${done}/${total} done` : "None yet"}
        </span>
      </div>

      {total > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1">
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No milestones yet. Add one below.
          </p>
        )}
        {items.map((item) => (
          <label
            key={item.id}
            className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <input
              type="checkbox"
              checked={item.is_done}
              disabled={busyId === item.id || !canEdit}
              onChange={() => handleToggle(item)}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-accent focus:ring-accent/30 dark:border-slate-600"
            />
            <span
              className={`flex-1 ${
                item.is_done
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {item.title}
            </span>
            {formatDate(item.due_date) && (
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatDate(item.due_date)}
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={busyId === item.id}
                aria-label="Remove milestone"
                className="hidden shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
            )}
          </label>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-700 sm:flex-row sm:items-center">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add milestone…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newTitle.trim()}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
