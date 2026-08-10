"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { DealCard } from "./DealCard";
import { STAGES } from "./stages";
import type { Deal, DealStage } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function KanbanColumn({
  stage,
  label,
  columnClass,
  deals,
  children,
}: {
  stage: DealStage;
  label: string;
  columnClass: string;
  deals: Deal[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const value = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl border-x border-b border-t-4 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${columnClass}`}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {deals.length}
        </span>
      </div>
      <p className="px-1 text-xs text-slate-400 dark:text-slate-500">{currency.format(value)}</p>

      <div
        ref={setNodeRef}
        className={`flex min-h-[5rem] flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? "bg-accent/5 ring-2 ring-accent/30" : ""
        }`}
      >
        {children}
        {deals.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No deals
          </p>
        )}
      </div>
    </div>
  );
}

export function DealsKanban({
  deals,
  onStageChange,
  onEdit,
  onDelete,
  onDealUpdated,
  canEdit,
}: {
  deals: Deal[];
  onStageChange: (deal: Deal, stage: DealStage) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onDealUpdated: (patch: Partial<Deal> & { id: string }) => void;
  canEdit: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const columns = STAGES.map((s) => ({
    ...s,
    deals: deals.filter((d) => d.stage === s.value),
  }));
  const activeDeal = activeId ? (deals.find((d) => d.id === activeId) ?? null) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const deal = deals.find((d) => d.id === active.id);
    if (!deal) return;

    const stage = over.id as DealStage;
    if (stage === deal.stage) return;

    onStageChange(deal, stage);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <KanbanColumn
            key={col.value}
            stage={col.value}
            label={col.label}
            columnClass={col.column}
            deals={col.deals}
          >
            {col.deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onEdit={() => onEdit(deal)}
                onDelete={() => onDelete(deal)}
                onDealUpdated={onDealUpdated}
                canEdit={canEdit}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="w-72 rounded-xl border border-accent/40 bg-white p-3 shadow-lg dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activeDeal.title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {activeDeal.value != null ? currency.format(activeDeal.value) : "—"}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
