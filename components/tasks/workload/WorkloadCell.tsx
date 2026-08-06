"use client";

import { useDroppable } from "@dnd-kit/core";

export function WorkloadCell({
  id,
  dayIndex,
  laneCount,
  isToday,
  isWeekend,
  onClick,
}: {
  id: string;
  dayIndex: number;
  laneCount: number;
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      role="button"
      tabIndex={-1}
      style={{ gridColumn: dayIndex + 1, gridRow: `1 / span ${Math.max(laneCount, 1)}` }}
      className={`min-h-9 cursor-pointer rounded-md border border-transparent transition-colors ${
        isOver
          ? "bg-accent/10 ring-2 ring-accent/30"
          : isToday
            ? "bg-accent/5"
            : isWeekend
              ? "bg-slate-50 dark:bg-slate-900/40"
              : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
      }`}
    />
  );
}
