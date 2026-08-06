"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { WorkloadCell } from "./WorkloadCell";
import { WorkloadBar } from "./WorkloadBar";
import { addDays, diffDays, isSameDay, packLanes, parseDateOnly, toDateOnly } from "./dateUtils";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import type { Task } from "@/lib/types";

export type WorkloadRow = { id: string; label: string; unassigned?: boolean };

const ROW_LABEL_WIDTH = 200;
const DAY_COLUMN_WIDTH = 96;
const LANE_HEIGHT = 30;

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDateOnly(dueDate) < today;
}

export function WorkloadGrid({
  rows,
  days,
  tasksByRowId,
  movingId,
  onCellClick,
  onTaskClick,
  onScheduleChange,
}: {
  rows: WorkloadRow[];
  days: Date[];
  tasksByRowId: Map<string, Task[]>;
  movingId: string | null;
  onCellClick: (row: WorkloadRow, date: Date) => void;
  onTaskClick: (task: Task) => void;
  onScheduleChange: (
    task: Task,
    next: { assignedTo: string | null; startDate: string; dueDate: string }
  ) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const windowStart = days[0];

  const allTasks = useMemo(() => rows.flatMap((r) => tasksByRowId.get(r.id) ?? []), [rows, tasksByRowId]);
  const activeTask = activeId ? (allTasks.find((t) => t.id === activeId) ?? null) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const task = allTasks.find((t) => t.id === active.id);
    if (!task || !task.due_date) return;

    const [targetRowId, targetDateIso] = String(over.id).split("::");
    const targetDate = parseDateOnly(targetDateIso);
    const currentStart = task.start_date ? parseDateOnly(task.start_date) : parseDateOnly(task.due_date);
    const currentDue = parseDateOnly(task.due_date);
    const durationDays = Math.max(0, diffDays(currentDue, currentStart));

    const newStart = targetDate;
    const newDue = addDays(targetDate, durationDays);
    const newAssignee = targetRowId === "unassigned" ? null : targetRowId;

    const unchanged =
      toDateOnly(newStart) === (task.start_date ?? task.due_date) &&
      toDateOnly(newDue) === task.due_date &&
      newAssignee === (task.assigned_to ?? null);
    if (unchanged) return;

    onScheduleChange(task, {
      assignedTo: newAssignee,
      startDate: toDateOnly(newStart),
      dueDate: toDateOnly(newDue),
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div style={{ minWidth: ROW_LABEL_WIDTH + days.length * DAY_COLUMN_WIDTH }}>
          {/* Header row: sticky top, day labels */}
          <div
            className="sticky top-0 z-20 grid border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            style={{ gridTemplateColumns: `${ROW_LABEL_WIDTH}px repeat(${days.length}, ${DAY_COLUMN_WIDTH}px)` }}
          >
            <div className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Team
            </div>
            {days.map((day) => {
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={day.toISOString()}
                  className={`px-2 py-2 text-center text-xs font-medium ${
                    isSameDay(day, today)
                      ? "text-accent-hover dark:text-accent"
                      : weekend
                        ? "text-slate-400 dark:text-slate-500"
                        : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <div className="uppercase">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="text-sm">{day.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Member rows */}
          {rows.map((row) => {
            const rowTasks = (tasksByRowId.get(row.id) ?? []).filter((t) => t.due_date);
            const positioned = rowTasks
              .map((task) => {
                const due = parseDateOnly(task.due_date!);
                const start = task.start_date ? parseDateOnly(task.start_date) : due;
                const startIdx = diffDays(start, windowStart);
                const endIdx = diffDays(due, windowStart);
                return { task, startIdx, endIdx };
              })
              .filter((p) => p.endIdx >= 0 && p.startIdx < days.length);

            const lanes = packLanes(positioned.map((p) => ({ id: p.task.id, startIdx: p.startIdx, endIdx: p.endIdx })));
            const laneCount = positioned.length > 0 ? Math.max(...positioned.map((p) => lanes.get(p.task.id) ?? 0)) + 1 : 1;

            return (
              <div
                key={row.id}
                className="grid border-b border-slate-100 last:border-b-0 dark:border-slate-700/60"
                style={{
                  gridTemplateColumns: `${ROW_LABEL_WIDTH}px repeat(${days.length}, ${DAY_COLUMN_WIDTH}px)`,
                  minHeight: laneCount * LANE_HEIGHT + 12,
                }}
              >
                <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-slate-100 bg-white px-3 py-2 dark:border-slate-700/60 dark:bg-slate-800">
                  {row.unassigned ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400 dark:border-slate-600 dark:text-slate-500">
                      ?
                    </span>
                  ) : (
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tagColor(row.label).dot}`}
                    >
                      {getInitials(row.label)}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                    {row.label}
                  </span>
                </div>

                <div
                  className="relative grid gap-y-0.5 py-1.5"
                  style={{
                    gridColumn: `2 / span ${days.length}`,
                    gridTemplateColumns: `repeat(${days.length}, ${DAY_COLUMN_WIDTH}px)`,
                    gridTemplateRows: `repeat(${laneCount}, ${LANE_HEIGHT}px)`,
                  }}
                >
                  {days.map((day, dayIndex) => (
                    <WorkloadCell
                      key={day.toISOString()}
                      id={`${row.id}::${toDateOnly(day)}`}
                      dayIndex={dayIndex}
                      laneCount={laneCount}
                      isToday={isSameDay(day, today)}
                      isWeekend={day.getDay() === 0 || day.getDay() === 6}
                      onClick={() => onCellClick(row, day)}
                    />
                  ))}
                  {positioned.map(({ task, startIdx, endIdx }) => {
                    const clippedStart = Math.max(startIdx, 0);
                    const clippedEnd = Math.min(endIdx, days.length - 1);
                    const lane = lanes.get(task.id) ?? 0;
                    return (
                      <WorkloadBar
                        key={task.id}
                        task={task}
                        gridColumn={`${clippedStart + 1} / ${clippedEnd + 2}`}
                        gridRow={lane + 1}
                        moving={movingId === task.id}
                        overdue={isOverdue(task.due_date)}
                        onClick={() => onTaskClick(task)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white shadow-lg">
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
