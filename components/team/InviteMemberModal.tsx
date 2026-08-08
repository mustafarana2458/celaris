"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createInvitation } from "@/lib/actions/team-invites";

const INVITE_ROLES: { value: "member" | "admin"; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

export function InviteMemberModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; warning?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setError(null);
      setSent(null);
    }
  }, [open]);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") ?? "").trim();
      const result = await createInvitation(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent({ email, warning: result.emailWarning });
    });
  }

  function handleDone() {
    setSent(null);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite member">
      {sent ? (
        <div className="flex flex-col gap-4">
          {sent.warning ? (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              {sent.warning}
            </div>
          ) : (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-400">
              Invite email sent to {sent.email}.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="button" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form action={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <Input label="Email" name="email" type="email" placeholder="teammate@company.com" required />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="member"
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            We&apos;ll email them a link to join. You can also copy the link from Pending Invites
            if you&apos;d rather send it yourself.
          </p>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Send invite
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
