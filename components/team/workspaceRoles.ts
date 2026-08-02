import type { WorkspaceRole } from "@/lib/types";

export const WORKSPACE_ROLES: { value: WorkspaceRole; label: string; badge: string }[] = [
  { value: "owner", label: "Owner", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  { value: "admin", label: "Admin", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "member", label: "Member", badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
];
