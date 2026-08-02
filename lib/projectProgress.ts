import type { Milestone, TaskStatus } from "@/lib/types";

export type ProjectProgress = {
  percent: number;
  source: "milestones" | "tasks" | "none";
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
};

export function getProjectProgress(
  milestones: Pick<Milestone, "is_done">[],
  tasks: { status: TaskStatus }[]
): ProjectProgress {
  const milestonesTotal = milestones.length;
  const milestonesDone = milestones.filter((m) => m.is_done).length;
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === "done").length;

  if (milestonesTotal > 0) {
    return {
      percent: Math.round((milestonesDone / milestonesTotal) * 100),
      source: "milestones",
      milestonesDone,
      milestonesTotal,
      tasksDone,
      tasksTotal,
    };
  }

  if (tasksTotal > 0) {
    return {
      percent: Math.round((tasksDone / tasksTotal) * 100),
      source: "tasks",
      milestonesDone,
      milestonesTotal,
      tasksDone,
      tasksTotal,
    };
  }

  return {
    percent: 0,
    source: "none",
    milestonesDone,
    milestonesTotal,
    tasksDone,
    tasksTotal,
  };
}
