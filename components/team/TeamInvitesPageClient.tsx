"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { InviteMemberModal } from "./InviteMemberModal";
import { PendingInvitationsList } from "./PendingInvitationsList";
import type { Invitation } from "@/lib/types";

export function TeamInvitesPageClient({
  invitations,
  canManage,
}: {
  invitations: Invitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);

  function handleInviteSaved() {
    setInviteOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pending Invites</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Invites that have been sent but not yet accepted.
          </p>
        </div>
        {canManage && <Button onClick={() => setInviteOpen(true)}>+ Invite member</Button>}
      </div>

      {invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="team" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No pending invites</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Everyone you&apos;ve invited has either joined or hasn&apos;t been invited yet.
          </p>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="mt-1">
              + Invite member
            </Button>
          )}
        </div>
      ) : (
        <PendingInvitationsList invitations={invitations} />
      )}

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onSaved={handleInviteSaved} />
    </div>
  );
}
