"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createTeamMember, updateTeamMember } from "@/lib/actions/team";
import type { TeamMember } from "@/lib/types";

export function TeamMemberModal({
  open,
  onClose,
  member,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!member;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateTeamMember(member!.id, formData)
        : await createTeamMember(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit team member" : "Add team member"}
    >
      <form key={member?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Name"
          name="member_name"
          defaultValue={member?.member_name}
          required
        />

        <Input
          label="Title"
          name="job_title"
          placeholder="Freelance Designer, Contractor..."
          defaultValue={member?.job_title ?? ""}
        />

        <Input
          label="Email"
          name="member_email"
          type="email"
          defaultValue={member?.member_email ?? ""}
        />

        <Input
          label="Contact / Phone"
          name="phone_number"
          type="tel"
          defaultValue={member?.phone_number ?? ""}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Save Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
}
