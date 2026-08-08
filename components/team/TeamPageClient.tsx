"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { TeamMemberModal } from "./TeamMemberModal";
import { DeleteTeamMemberDialog } from "./DeleteTeamMemberDialog";
import { InviteMemberModal } from "./InviteMemberModal";
import { WorkspaceMembersList } from "./WorkspaceMembersList";
import { PendingInvitationsList } from "./PendingInvitationsList";
import { TEAM_ROLES } from "./roles";
import type { Invitation, TeamMember, WorkspaceRole, WorkspaceTeamMember } from "@/lib/types";

const roleMap = Object.fromEntries(TEAM_ROLES.map((r) => [r.value, r]));

function roleBadge(role: string) {
  const r = roleMap[role];
  return r ? (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${r.badge}`}>
      {r.label}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      {role}
    </span>
  );
}

export function TeamPageClient({
  workspaceMembers,
  invitations,
  currentUserId,
  currentUserRole,
  initialTeamMembers,
}: {
  workspaceMembers: WorkspaceTeamMember[];
  invitations: Invitation[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  initialTeamMembers: TeamMember[];
}) {
  const router = useRouter();
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(member: TeamMember) {
    setEditing(member);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    router.refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    router.refresh();
  }

  function handleInviteSaved() {
    setInviteOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Team</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage who has access to this workspace and keep a directory of your team.
          </p>
        </div>
        {canManage && <Button onClick={() => setInviteOpen(true)}>+ Invite member</Button>}
      </div>

      <WorkspaceMembersList
        members={workspaceMembers}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        canManage={canManage}
      />

      {canManage && <PendingInvitationsList invitations={invitations} />}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team directory</h2>
          <Button onClick={openAdd}>+ Add team member</Button>
        </div>

        {initialTeamMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
              <NavIcon name="team" className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No team members yet</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Add people to your team directory to keep track of who&apos;s who, even before they
              have a login.
            </p>
            <Button onClick={openAdd} className="mt-1">
              + Add team member
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {initialTeamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {member.member_name}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {member.member_email || "—"}
                      </td>
                      <td className="px-5 py-3">{roleBadge(member.role)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(member)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleting(member)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSaved={handleInviteSaved}
      />

      <TeamMemberModal
        open={modalOpen}
        onClose={closeModal}
        member={editing}
        onSaved={handleSaved}
      />

      <DeleteTeamMemberDialog
        member={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
