"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { generateFollowUpMessage } from "@/lib/actions/ai";
import type { Contact } from "@/lib/types";

export function AiFollowUpModal({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!contact) return;

    let cancelled = false;
    setLoading(true);
    setMessage(null);
    setError(null);
    setCopied(false);

    generateFollowUpMessage(contact.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message ?? "");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contact]);

  async function handleCopy() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={!!contact} onClose={onClose} title="AI follow-up message">
      <div className="flex flex-col gap-4">
        {contact && (
          <p className="text-sm text-slate-500">
            Personalized follow-up for{" "}
            <span className="font-medium text-slate-900">{contact.name}</span>
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 py-10">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <p className="text-sm text-slate-500">
              Generating message… this can take up to 30 seconds.
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && message && (
          <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!loading && message && (
            <Button type="button" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
