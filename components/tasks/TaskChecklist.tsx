"use client";

import { useEffect, useState } from "react";
import { createSubtask, deleteSubtask, toggleSubtask } from "@/lib/actions/subtasks";
import type { Subtask } from "@/lib/types";

export function TaskChecklist({
  taskId,
  subtasks,
  canEdit,
  onChanged,
}: {
  taskId: string;
  subtasks: Subtask[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [items, setItems] = useState(subtasks);
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setItems(subtasks), [subtasks]);

  const done = items.filter((i) => i.is_done).length;
  const total = items.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    setError(null);
    const result = await createSubtask(taskId, title);
    setAdding(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewTitle("");
    setExpanded(true);
    onChanged();
  }

  async function handleToggle(item: Subtask) {
    setBusyId(item.id);
    setError(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)));
    const result = await toggleSubtask(item.id, !item.is_done);
    setBusyId(null);
    if (result.error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: item.is_done } : i)));
      setError(result.error);
      return;
    }
    onChanged();
  }

  async function handleDelete(item: Subtask) {
    setBusyId(item.id);
    setError(null);
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const result = await deleteSubtask(item.id);
    setBusyId(null);
    if (result.error) {
      setItems(previous);
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        {total > 0 ? `${done}/${total} sub-tasks` : "Sub-tasks"}
      </button>

      {total > 0 && (
        <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {expanded && (
        <div className="mt-1 flex flex-col gap-1">
          {items.map((item) => (
            <label
              key={item.id}
              className="group flex items-center gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <input
                type="checkbox"
                checked={item.is_done}
                disabled={busyId === item.id || !canEdit}
                onChange={() => handleToggle(item)}
                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-accent focus:ring-accent/30 dark:border-slate-600"
              />
              <span
                className={`flex-1 ${
                  item.is_done
                    ? "text-slate-400 line-through dark:text-slate-500"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {item.title}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={busyId === item.id}
                  aria-label="Remove sub-task"
                  className="hidden shrink-0 rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    className="h-3 w-3"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </label>
          ))}

          {canEdit && (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Add sub-task…"
                className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding || !newTitle.trim()}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 disabled:opacity-40 dark:text-accent dark:hover:bg-accent/15"
              >
                Add
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
