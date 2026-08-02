"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole, removeMember } from "@/lib/actions/team-invites";
import { WORKSPACE_ROLES } from "./workspaceRoles";
import type { WorkspaceRole, WorkspaceTeamMember } from "@/lib/types";

const roleMap = Object.fromEntries(WORKSPACE_ROLES.map((r) => [r.value, r]));

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspaceMembersList({
  members,
  currentUserId,
  canManage,
}: {
  members: WorkspaceTeamMember[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(members);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRows(members), [members]);

  async function handleRoleChange(member: WorkspaceTeamMember, role: WorkspaceRole) {
    if (role === member.role) return;
    setBusyId(member.user_id);
    setError(null);
    setRows((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role } : m)));

    const result = await updateMemberRole(member.user_id, role);
    setBusyId(null);
    if (result.error) {
      setRows((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? { ...m, role: member.role } : m))
      );
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove(member: WorkspaceTeamMember) {
    if (!confirm(`Remove ${member.full_name || member.email || "this member"} from the workspace?`)) {
      return;
    }
    setBusyId(member.user_id);
    setError(null);
    const previous = rows;
    setRows((prev) => prev.filter((m) => m.user_id !== member.user_id));

    const result = await removeMember(member.user_id);
    setBusyId(null);
    if (result.error) {
      setRows(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Workspace members</h2>
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                {canManage && <th className="px-5 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((m) => {
                const isSelf = m.user_id === currentUserId;
                const canEditThisRow = canManage && !isSelf;
                return (
                  <tr key={m.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {m.full_name || "Unnamed user"}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-hover dark:bg-accent/15 dark:text-accent">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{m.email || "—"}</td>
                    <td className="px-5 py-3">
                      {canEditThisRow ? (
                        <select
                          value={m.role}
                          disabled={busyId === m.user_id}
                          onChange={(e) => handleRoleChange(m, e.target.value as WorkspaceRole)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-accent disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {WORKSPACE_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleMap[m.role]?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                        >
                          {roleMap[m.role]?.label ?? m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(m.joined_at)}
                    </td>
                    {canManage && (
                      <td className="px-5 py-3">
                        {canEditThisRow && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleRemove(m)}
                              disabled={busyId === m.user_id}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
                    className="px-5 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No workspace members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
