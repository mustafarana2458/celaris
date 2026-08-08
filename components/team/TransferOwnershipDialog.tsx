"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { transferOwnership } from "@/lib/actions/team-invites";
import type { WorkspaceTeamMember } from "@/lib/types";

export function TransferOwnershipDialog({
  member,
  onClose,
  onTransferred,
}: {
  member: WorkspaceTeamMember | null;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!member) return;
    setError(null);
    startTransition(async () => {
      const result = await transferOwnership(member.user_id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onTransferred();
    });
  }

  return (
    <Modal open={!!member} onClose={onClose} title="Transfer ownership">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Make{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {member?.full_name || member?.email || "this member"}
          </span>{" "}
          the new workspace owner? You will be changed from Owner to Admin. This action cannot be
          undone.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={isPending}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Transfer ownership
          </Button>
        </div>
      </div>
    </Modal>
  );
}
