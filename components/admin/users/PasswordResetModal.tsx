"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type ResetResponse = { ok: true; actionLink: string } | { ok: false; error: string };

export function PasswordResetModal({
  open,
  onClose,
  userId,
  email,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  email: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    if (submitting) return;
    setError(null);
    setActionLink(null);
    setCopied(false);
    onClose();
  }

  async function handleGenerate() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    let json: ResetResponse | null = null;
    try {
      const res = await fetch("/api/admin/users/reset-password-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      json = (await res.json()) as ResetResponse;
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error || "Could not generate a reset link.");
      return;
    }

    setActionLink(json.actionLink);
  }

  async function handleCopy() {
    if (!actionLink) return;
    try {
      await navigator.clipboard.writeText(actionLink);
      setCopied(true);
    } catch {
      // Clipboard permission can fail silently in some browsers/contexts --
      // the link is still shown in the textarea below for manual copy.
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Send password reset">
      <div className="flex flex-col gap-4">
        {!actionLink ? (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Generate a password reset link for <strong>{email ?? "this user"}</strong>?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This does not set or reveal their password -- it creates a one-time link the user completes the reset
              through themselves. This does not send an email automatically (SMTP delivery isn&apos;t confirmed
              working on this instance); copy the link after it&apos;s generated and send it to the user yourself.
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" loading={submitting} onClick={handleGenerate}>
                Generate link
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Link generated. Copy it and send it to the user through a channel you trust is working.
            </p>
            <textarea
              readOnly
              value={actionLink}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={handleCopy}>
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
