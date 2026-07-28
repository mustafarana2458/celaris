import type { TeamRole } from "@/lib/types";

export const TEAM_ROLES: {
  value: TeamRole;
  label: string;
  badge: string;
}[] = [
  { value: "owner", label: "Owner", badge: "bg-blue-50 text-blue-700" },
  { value: "admin", label: "Admin", badge: "bg-amber-50 text-amber-700" },
  { value: "member", label: "Member", badge: "bg-slate-100 text-slate-600" },
];
