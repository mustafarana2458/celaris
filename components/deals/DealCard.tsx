"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Deal } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function scoreBadgeClass(score: number) {
  if (score <= 40) return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
  if (score <= 70) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
}

export function DealCard({
  deal,
  onEdit,
  onDelete,
  onScore,
  scoring,
  scoreReason,
  scoreError,
}: {
  deal: Deal;
  onEdit: () => void;
  onDelete: () => void;
  onScore: () => void;
  scoring: boolean;
  scoreReason?: string;
  scoreError?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const companyName = deal.contacts?.companies?.name ?? deal.contacts?.company;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{deal.title}</p>
          {deal.ai_score != null && (
            <span
              title="AI likelihood-to-close score"
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(deal.ai_score)}`}
            >
              {deal.ai_score}
            </span>
          )}
        </div>
        {(deal.contacts?.name || companyName) && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {deal.contacts?.name}
            {deal.contacts?.name && companyName ? " · " : ""}
            {companyName}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {deal.value != null ? currency.format(deal.value) : "—"}
          </span>
          {formatDate(deal.expected_close) && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDate(deal.expected_close)}
            </span>
          )}
        </div>
      </div>

      {scoreReason && (
        <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">{scoreReason}</p>
      )}
      {scoreError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{scoreError}</p>}

      <div className="mt-3 flex items-center justify-between gap-1">
        <button
          onClick={onScore}
          disabled={scoring}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-60 dark:text-purple-400 dark:hover:bg-purple-950/40"
        >
          {scoring && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600 dark:border-purple-800" />
          )}
          {scoring ? "Scoring…" : "AI Score"}
        </button>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
