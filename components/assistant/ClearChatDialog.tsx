"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clearAiChatHistory } from "@/lib/actions/aiChatHistory";

export function ClearChatDialog({
  open,
  saveHistory,
  onClose,
  onCleared,
}: {
  open: boolean;
  saveHistory: boolean;
  onClose: () => void;
  onCleared: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClear() {
    setError(null);
    startTransition(async () => {
      // Nothing was ever persisted while Save Chat History was off, so
      // there's nothing in the database to delete -- just clear the view.
      if (saveHistory) {
        const result = await clearAiChatHistory();
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      onCleared();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Clear chat">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {saveHistory
            ? "This will permanently delete this conversation from the database. This action cannot be undone."
            : "This will clear the current conversation from view. Nothing has been saved to the database, so there's nothing to undo."}
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
            onClick={handleClear}
            className="bg-red-600 hover:bg-red-700"
          >
            Clear Chat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
