"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type SuspendResponse = { ok: true; noChange: boolean; suspended: boolean } | { ok: false; error: string };

export function SuspendModal({
  open,
  onClose,
  userId,
  email,
  currentlySuspended,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  email: string | null;
  currentlySuspended: boolean;
  onApplied: (suspended: boolean) => void;
}) {
  const targetSuspended = !currentlySuspended;
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setConfirming(false);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    let json: SuspendResponse | null = null;
    try {
      const res = await fetch("/api/admin/users/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, suspended: targetSuspended }),
      });
      json = (await res.json()) as SuspendResponse;
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error || "Could not update this account's status.");
      return;
    }

    onApplied(json.suspended);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={targetSuspended ? "Suspend account" : "Unsuspend account"}>
      <div className="flex flex-col gap-4">
        {!confirming ? (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {targetSuspended ? (
                <>
                  Suspend <strong>{email ?? "this user"}</strong>? They will be blocked from signing in, and any
                  currently active session will stop working once it needs to refresh (typically within about an
                  hour).
                </>
              ) : (
                <>
                  Lift the suspension on <strong>{email ?? "this user"}</strong>? They will immediately be able to
                  sign in again.
                </>
              )}
            </p>
            {targetSuspended && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                This is enforced by the Supabase auth server itself (an account ban), not a setting inside this app --
                it blocks login at the source, independent of any workspace they belong to.
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" variant={targetSuspended ? "primary" : "secondary"} onClick={() => setConfirming(true)}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Are you sure? {targetSuspended ? "This will block their login immediately." : "This restores their access immediately."}
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button type="button" loading={submitting} onClick={handleConfirm}>
                {targetSuspended ? "Suspend" : "Unsuspend"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
