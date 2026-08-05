"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createProjectTemplate, updateProjectTemplate } from "@/lib/actions/projectTemplates";
import type { ProjectTemplateRecord, TaskPriority } from "@/lib/types";

type TaskDraft = { id: string; title: string; priority: TaskPriority };
type MilestoneDraft = { id: string; title: string; dueInDays: number; tasks: TaskDraft[] };

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

function newId() {
  return crypto.randomUUID();
}

function draftsFromTemplate(template: ProjectTemplateRecord | null): MilestoneDraft[] {
  if (!template) return [];
  return template.structure.milestones.map((m) => ({
    id: newId(),
    title: m.title,
    dueInDays: m.dueInDays,
    tasks: m.tasks.map((t) => ({ id: newId(), title: t.title, priority: t.priority })),
  }));
}

const fieldClass =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function SortableTaskRow({
  task,
  onChange,
  onRemove,
}: {
  task: TaskDraft;
  onChange: (patch: Partial<TaskDraft>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
        aria-label="Reorder task"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <input
        type="text"
        value={task.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="e.g. Send onboarding questionnaire"
        className={`${fieldClass} flex-1`}
      />
      <select
        value={task.priority}
        onChange={(e) => onChange({ priority: e.target.value as TaskPriority })}
        className={`${fieldClass} capitalize`}
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p} className="capitalize">
            {p}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove task"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SortableMilestoneCard({
  milestone,
  onChange,
  onRemove,
}: {
  milestone: MilestoneDraft;
  onChange: (patch: Partial<Omit<MilestoneDraft, "id">>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id });
  const taskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function addTask() {
    onChange({ tasks: [...milestone.tasks, { id: newId(), title: "", priority: "medium" }] });
  }

  function updateTask(taskId: string, patch: Partial<TaskDraft>) {
    onChange({ tasks: milestone.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) });
  }

  function removeTask(taskId: string) {
    onChange({ tasks: milestone.tasks.filter((t) => t.id !== taskId) });
  }

  function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = milestone.tasks.findIndex((t) => t.id === active.id);
    const newIndex = milestone.tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({ tasks: arrayMove(milestone.tasks, oldIndex, newIndex) });
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
          aria-label="Reorder milestone"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={milestone.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Phase 1: Discovery"
          className={`${fieldClass} flex-1 font-medium`}
        />
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          Due in
          <input
            type="number"
            min="0"
            value={milestone.dueInDays}
            onChange={(e) => onChange({ dueInDays: Math.max(0, Number(e.target.value) || 0) })}
            className={`${fieldClass} w-16`}
          />
          days
        </label>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove milestone"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 pl-6">
        <DndContext sensors={taskSensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
          <SortableContext items={milestone.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {milestone.tasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                onChange={(patch) => updateTask(task.id, patch)}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {milestone.tasks.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">No tasks in this phase yet.</p>
        )}

        <button
          type="button"
          onClick={addTask}
          className="flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
    </div>
  );
}

export function TemplateBuilderModal({
  open,
  onClose,
  template,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  template: ProjectTemplateRecord | null;
  onSaved: (template: ProjectTemplateRecord) => void;
}) {
  const isEdit = !!template;
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(() => draftsFromTemplate(template));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const milestoneSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!open) return;
    setMilestones(draftsFromTemplate(template));
    setError(null);
    // Re-seed whenever the modal opens (covers: switching which template is
    // being edited, and clearing a cancelled draft on reopening "Create").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  function addMilestone() {
    setMilestones((prev) => [...prev, { id: newId(), title: "", dueInDays: 7, tasks: [] }]);
  }

  function updateMilestone(id: string, patch: Partial<Omit<MilestoneDraft, "id">>) {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeMilestone(id: string) {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  function handleMilestoneDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setMilestones((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id);
      const newIndex = prev.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    if (milestones.length === 0) {
      setError("Add at least one milestone phase.");
      return;
    }
    if (milestones.some((m) => !m.title.trim())) {
      setError("Every milestone needs a title.");
      return;
    }
    if (milestones.some((m) => m.tasks.some((t) => !t.title.trim()))) {
      setError("Every task needs a title (or remove the empty row).");
      return;
    }

    const structure = {
      milestones: milestones.map((m) => ({
        title: m.title.trim(),
        dueInDays: m.dueInDays,
        tasks: m.tasks.map((t) => ({ title: t.title.trim(), priority: t.priority })),
      })),
    };
    formData.set("structure", JSON.stringify(structure));

    startTransition(async () => {
      const result = isEdit
        ? await updateProjectTemplate(template!.id, formData)
        : await createProjectTemplate(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.template) onSaved(result.template);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit template" : "Create template"}
      size="wide"
    >
      <form key={template?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Template name" name="name" defaultValue={template?.name} required />
          <Input
            label="Estimated duration (days)"
            name="estimated_duration_days"
            type="number"
            min="0"
            defaultValue={template?.estimated_duration_days ?? ""}
          />
        </div>

        <Textarea
          label="Description"
          name="description"
          rows={2}
          defaultValue={template?.description ?? ""}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Milestones & tasks
            </label>
            <button
              type="button"
              onClick={addMilestone}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
            >
              <Plus className="h-4 w-4" />
              Add milestone phase
            </button>
          </div>

          {milestones.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No milestones yet. Add a phase to start building the template.
            </p>
          ) : (
            <div className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto pr-1">
              <DndContext
                sensors={milestoneSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleMilestoneDragEnd}
              >
                <SortableContext items={milestones.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  {milestones.map((milestone) => (
                    <SortableMilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      onChange={(patch) => updateMilestone(milestone.id, patch)}
                      onRemove={() => removeMilestone(milestone.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create template"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
