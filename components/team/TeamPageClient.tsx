"use client";

import { WorkspaceMembersList } from "./WorkspaceMembersList";
import type { WorkspaceRole, WorkspaceTeamMember } from "@/lib/types";

export function TeamPageClient({
  workspaceMembers,
  currentUserId,
  currentUserRole,
}: {
  workspaceMembers: WorkspaceTeamMember[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
}) {
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Team</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage who has access to this workspace.
        </p>
      </div>

      <WorkspaceMembersList
        members={workspaceMembers}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        canManage={canManage}
      />
    </div>
  );
}
