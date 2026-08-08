"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TaskModal, type NewTaskPrefill } from "../TaskModal";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { WorkloadGrid, type WorkloadRow } from "./WorkloadGrid";
import { addDays, startOfWeek, toDateOnly } from "./dateUtils";
import { updateTaskSchedule } from "@/lib/actions/tasks";
import { buildAssigneeOptions, parseAssigneeKey, taskAssigneeDisplay, taskAssigneeKey } from "@/lib/assignee";
import type { Project, Task, TeamMember, WorkspaceTeamMember } from "@/lib/types";

const WINDOW_DAYS = 21;

export function WorkloadPageClient({
  initialTasks,
  projects,
  members,
  directory,
  currentUserId,
}: {
  initialTasks: Task[];
  projects: Pick<Project, "id" | "name">[];
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [windowStart, setWindowStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [prefill, setPrefill] = useState<NewTaskPrefill | undefined>(undefined);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const days = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart]
  );

  const rows: WorkloadRow[] = useMemo(
    () => [
      ...buildAssigneeOptions(members, directory).map((o) => ({
        id: o.key,
        label: o.name,
        isExternal: o.kind === "directory",
      })),
      { id: "unassigned", label: "Unassigned", unassigned: true },
    ],
    [members, directory]
  );

  const tasksByRowId = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const row of rows) map.set(row.id, []);
    for (const task of tasks) {
      const key = taskAssigneeKey(task);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks, rows]);

  const unscheduledTasks = useMemo(() => tasks.filter((t) => !t.due_date), [tasks]);

  function openAdd(prefillValue?: NewTaskPrefill) {
    setEditing(null);
    setPrefill(prefillValue);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setPrefill(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setPrefill(undefined);
  }

  function handleSaved() {
    closeModal();
    router.refresh();
  }

  function resolveAssigneeFields(assigneeKey: string | null) {
    const ref = parseAssigneeKey(assigneeKey);
    if (!ref) return { assigned_to: null, assigned_to_member_id: null, assignee: null, assignee_member: null };

    if (ref.kind === "user") {
      const member = members.find((m) => m.user_id === ref.id);
      return {
        assigned_to: ref.id,
        assigned_to_member_id: null,
        assignee: member ? { id: member.user_id, full_name: member.full_name ?? member.email ?? "Unnamed" } : null,
        assignee_member: null,
      };
    }

    const dirMember = directory.find((d) => d.id === ref.id);
    return {
      assigned_to: null,
      assigned_to_member_id: ref.id,
      assignee: null,
      assignee_member: dirMember ? { id: dirMember.id, member_name: dirMember.member_name, job_title: null } : null,
    };
  }

  async function handleScheduleChange(
    task: Task,
    next: { assigneeKey: string | null; startDate: string; dueDate: string }
  ) {
    setScheduleError(null);
    const previous = {
      assigned_to: task.assigned_to,
      assigned_to_member_id: task.assigned_to_member_id,
      start_date: task.start_date,
      due_date: task.due_date,
      assignee: task.assignee,
      assignee_member: task.assignee_member,
    };
    setMovingId(task.id);
    const patch = resolveAssigneeFields(next.assigneeKey);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              start_date: next.startDate,
              due_date: next.dueDate,
              ...patch,
            }
          : t
      )
    );

    const result = await updateTaskSchedule(task.id, {
      assignedTo: patch.assigned_to,
      assignedToMemberId: patch.assigned_to_member_id,
      startDate: next.startDate,
      dueDate: next.dueDate,
    });
    setMovingId(null);
    if (result.error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...previous } : t)));
      setScheduleError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Workload</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            See who&apos;s working on what, and when. Drag a task to reschedule or reassign it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setWindowStart((d) => addDays(d, -7))}
              className="rounded-l-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWindowStart(startOfWeek(new Date()))}
              className="border-x border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setWindowStart((d) => addDays(d, 7))}
              className="rounded-r-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => openAdd()}>+ Add task</Button>
        </div>
      </div>

      {scheduleError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t reschedule that task: {scheduleError}
        </div>
      )}

      {unscheduledTasks.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Unscheduled ({unscheduledTasks.length}) &middot; no due date, click to set one
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => {
              const assignee = taskAssigneeDisplay(task);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openEdit(task)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-accent/40 hover:bg-accent/5 dark:border-slate-600 dark:text-slate-300"
                >
                  {assignee && (
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-semibold text-white ${tagColor(assignee.name).dot} ${
                        assignee.isExternal
                          ? "ring-1 ring-dashed ring-offset-1 ring-slate-400 dark:ring-offset-slate-800 dark:ring-slate-500"
                          : ""
                      }`}
                    >
                      {getInitials(assignee.name)}
                    </span>
                  )}
                  {task.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add a task or click a cell below once your team has work scheduled.
          </p>
          <Button onClick={() => openAdd()} className="mt-1">
            + Add task
          </Button>
        </div>
      ) : (
        <WorkloadGrid
          rows={rows}
          days={days}
          tasksByRowId={tasksByRowId}
          movingId={movingId}
          onCellClick={(row, date) =>
            openAdd({
              assignedToKey: row.unassigned ? null : row.id,
              assignedToName: row.unassigned ? null : row.label,
              startDate: toDateOnly(date),
              dueDate: toDateOnly(date),
            })
          }
          onTaskClick={openEdit}
          onScheduleChange={handleScheduleChange}
        />
      )}

      <TaskModal
        open={modalOpen}
        onClose={closeModal}
        task={editing}
        projects={projects}
        members={members}
        directory={directory}
        currentUserId={currentUserId}
        newTaskPrefill={prefill}
        onSaved={handleSaved}
      />
    </div>
  );
}
