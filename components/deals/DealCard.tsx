"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { DealAiSummaryPanel } from "./DealAiSummaryPanel";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { resolveAssigneeDisplay } from "@/lib/assignee";
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

export function DealCard({
  deal,
  onEdit,
  onDelete,
  onDealUpdated,
  canEdit,
}: {
  deal: Deal;
  onEdit: () => void;
  onDelete: () => void;
  onDealUpdated: (patch: Partial<Deal> & { id: string }) => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled: !canEdit,
  });

  const companyName = deal.companies?.name ?? deal.contacts?.companies?.name ?? deal.contacts?.company;
  const owner = resolveAssigneeDisplay(deal.owner, deal.owner_member);

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
        {...(canEdit ? listeners : {})}
        {...(canEdit ? attributes : {})}
        className={canEdit ? "cursor-grab touch-none active:cursor-grabbing" : ""}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{deal.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {owner && (
              <span
                title={`Owner: ${owner.name}${owner.isExternal ? " (External)" : ""}`}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tagColor(owner.name).dot} ${
                  owner.isExternal
                    ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-offset-slate-800 dark:ring-slate-500"
                    : ""
                }`}
              >
                {getInitials(owner.name)}
              </span>
            )}
          </div>
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

      <div className="mt-3 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Summary
        </button>
        {canEdit && (
          <RowActionsMenu
            ariaLabel="Deal actions"
            actions={[
              { label: "Edit", onClick: onEdit, icon: Pencil },
              { label: "Delete", onClick: onDelete, icon: Trash2, destructive: true },
            ]}
          />
        )}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {expanded && (
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <DealAiSummaryPanel deal={deal} onUpdated={onDealUpdated} variant="compact" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
