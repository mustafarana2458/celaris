import type { TeamMember, WorkspaceTeamMember } from "./types";

export type AssigneeKind = "user" | "directory";

export type AssigneeOption = {
  key: string; // "user:<user_id>" | "directory:<team_member_id>"
  id: string;
  kind: AssigneeKind;
  name: string;
};

export type AssigneeRef = { kind: AssigneeKind; id: string } | null;

export function assigneeKey(kind: AssigneeKind, id: string): string {
  return `${kind}:${id}`;
}

export function parseAssigneeKey(key: string | null | undefined): AssigneeRef {
  if (!key || key === "unassigned") return null;
  const separatorIndex = key.indexOf(":");
  if (separatorIndex === -1) return null;
  const kind = key.slice(0, separatorIndex);
  const id = key.slice(separatorIndex + 1);
  if ((kind !== "user" && kind !== "directory") || !id) return null;
  return { kind, id };
}

// Any entity storing assignment as two mutually-exclusive nullable FK
// columns (a `users` FK and a `team_members` FK) turns that pair into one
// combined key through this -- the generic version of the pattern below.
export function combinedAssigneeKey(
  userId: string | null | undefined,
  memberId: string | null | undefined
): string {
  if (userId) return assigneeKey("user", userId);
  if (memberId) return assigneeKey("directory", memberId);
  return "unassigned";
}

// Task assignment is stored as two mutually-exclusive nullable FK columns
// (assigned_to -> users, assigned_to_member_id -> team_members) -- this is
// the single place that turns that pair into one combined key, used for
// grouping, filtering, and drag targets everywhere in the Tasks module.
export function taskAssigneeKey(task: {
  assigned_to: string | null;
  assigned_to_member_id?: string | null;
}): string {
  return combinedAssigneeKey(task.assigned_to, task.assigned_to_member_id);
}

// Resolves a task's assignee for display regardless of which of the two FK
// columns is populated, and flags directory (ghost) assignees so callers can
// render the "External" indicator consistently everywhere a task shows up.
export function taskAssigneeDisplay(task: {
  assignee?: { full_name: string } | null;
  assignee_member?: { member_name: string } | null;
}): { name: string; isExternal: boolean } | null {
  if (task.assignee) return { name: task.assignee.full_name, isExternal: false };
  if (task.assignee_member) return { name: task.assignee_member.member_name, isExternal: true };
  return null;
}

// Combined, order-preserving assignee list for pickers: active workspace
// members first, then directory (ghost) profiles. `directory` only needs
// id + member_name -- callers with the full TeamMember row can pass it as-is.
export function buildAssigneeOptions(
  members: WorkspaceTeamMember[],
  directory: Pick<TeamMember, "id" | "member_name">[]
): AssigneeOption[] {
  return [
    ...members.map((m) => ({
      key: assigneeKey("user", m.user_id),
      id: m.user_id,
      kind: "user" as const,
      name: m.full_name ?? m.email ?? "Unnamed",
    })),
    ...directory.map((d) => ({
      key: assigneeKey("directory", d.id),
      id: d.id,
      kind: "directory" as const,
      name: d.member_name,
    })),
  ];
}
