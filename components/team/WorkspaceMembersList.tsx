"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole, removeMember } from "@/lib/actions/team-invites";
import { RowActionsMenu, type RowAction } from "@/components/ui/RowActionsMenu";
import { WORKSPACE_ROLES } from "./workspaceRoles";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";
import { EditPermissionsDrawer } from "./EditPermissionsDrawer";
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
  currentUserRole,
  canManage,
}: {
  members: WorkspaceTeamMember[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  canManage: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(members);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<WorkspaceTeamMember | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<WorkspaceTeamMember | null>(null);

  const isOwnerViewer = currentUserRole === "owner";
  const roleOptions = isOwnerViewer ? WORKSPACE_ROLES : WORKSPACE_ROLES.filter((r) => r.value !== "owner");

  useEffect(() => setRows(members), [members]);

  function handleRoleSelect(member: WorkspaceTeamMember, role: WorkspaceRole) {
    if (role === member.role) return;
    if (role === "owner") {
      setTransferTarget(member);
      return;
    }
    handleRoleChange(member, role);
  }

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
                          onChange={(e) => handleRoleSelect(m, e.target.value as WorkspaceRole)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-accent disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {roleOptions.map((r) => (
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
                        {(() => {
                          const canEditPermissions = isOwnerViewer && !isSelf;
                          if (!canEditThisRow && !canEditPermissions) return null;

                          const actions: RowAction[] = [];
                          if (canEditPermissions) {
                            actions.push({
                              label: "Edit Permissions",
                              onClick: () => setPermissionsTarget(m),
                            });
                          }
                          if (canEditThisRow) {
                            actions.push({
                              label: "Remove",
                              onClick: () => handleRemove(m),
                              destructive: true,
                            });
                          }

                          return (
                            <div className="flex justify-end">
                              <RowActionsMenu
                                ariaLabel={`Actions for ${m.full_name || m.email || "member"}`}
                                actions={actions}
                              />
                            </div>
                          );
                        })()}
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

      <TransferOwnershipDialog
        member={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => {
          setTransferTarget(null);
          router.refresh();
        }}
      />

      <EditPermissionsDrawer
        member={permissionsTarget}
        onClose={() => setPermissionsTarget(null)}
        onSaved={() => {
          setPermissionsTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
