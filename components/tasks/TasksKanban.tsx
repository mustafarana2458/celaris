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
import { TaskCard } from "./TaskCard";
import { TASK_STATUSES } from "./statuses";
import type { Task, TaskStatus } from "@/lib/types";

function KanbanColumn({
  status,
  label,
  columnClass,
  tasks,
  children,
}: {
  status: TaskStatus;
  label: string;
  columnClass: string;
  tasks: Task[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl border-x border-b border-t-4 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${columnClass}`}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[5rem] flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? "bg-accent/5 ring-2 ring-accent/30" : ""
        }`}
      >
        {children}
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No tasks
          </p>
        )}
      </div>
    </div>
  );
}

export function TasksKanban({
  tasks,
  movingId,
  canEdit,
  onStatusChange,
  onEdit,
  onDelete,
  onBreakdown,
  onChecklistChanged,
}: {
  tasks: Task[];
  movingId: string | null;
  canEdit: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onBreakdown: (task: Task) => void;
  onChecklistChanged: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const columns = TASK_STATUSES.map((s) => ({
    ...s,
    tasks: tasks.filter((t) => t.status === s.value),
  }));
  const activeTask = activeId ? (tasks.find((t) => t.id === activeId) ?? null) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const status = over.id as TaskStatus;
    if (status === task.status) return;

    onStatusChange(task, status);
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
            status={col.value}
            label={col.label}
            columnClass={col.column}
            tasks={col.tasks}
          >
            {col.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                moving={movingId === task.id}
                canEdit={canEdit}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task)}
                onBreakdown={() => onBreakdown(task)}
                onChecklistChanged={onChecklistChanged}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rounded-xl border border-accent/40 bg-white p-3 shadow-lg dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
