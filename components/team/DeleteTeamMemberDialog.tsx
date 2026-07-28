"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteTeamMember } from "@/lib/actions/team";
import type { TeamMember } from "@/lib/types";

export function DeleteTeamMemberDialog({
  member,
  onClose,
  onDeleted,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!member) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTeamMember(member.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal open={!!member} onClose={onClose} title="Remove team member">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Are you sure you want to remove{" "}
          <span className="font-medium text-slate-900">{member?.member_name}</span>{" "}
          from the team directory? This action cannot be undone.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Remove
          </Button>
        </div>
      </div>
    </Modal>
  );
}
