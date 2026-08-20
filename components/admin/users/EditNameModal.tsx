"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type UpdateNameResponse = { ok: true; noChange: boolean; fullName: string } | { ok: false; error: string };

export function EditNameModal({
  open,
  onClose,
  userId,
  currentName,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentName: string | null;
  onApplied: (newName: string) => void;
}) {
  const [name, setName] = useState(currentName ?? "");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const unchanged = trimmed === (currentName ?? "").trim();

  function handleClose() {
    if (submitting) return;
    setName(currentName ?? "");
    setConfirming(false);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    let json: UpdateNameResponse | null = null;
    try {
      const res = await fetch("/api/admin/users/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fullName: trimmed }),
      });
      json = (await res.json()) as UpdateNameResponse;
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error || "Could not update the name.");
      return;
    }

    onApplied(json.fullName);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Edit display name">
      <div className="flex flex-col gap-4">
        {!confirming ? (
          <>
            <Input label="Full name" name="fullName" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This only changes this app&apos;s display name, not their login email or password.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!trimmed || unchanged} onClick={() => setConfirming(true)}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Set display name from <strong>{currentName || "(none)"}</strong> to <strong>{trimmed}</strong>?
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button type="button" loading={submitting} onClick={handleConfirm}>
                Save
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
