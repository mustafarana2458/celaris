"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clearAiUsageLog } from "@/lib/actions/aiUsage";

export function ClearAiUsageLogDialog({
  open,
  onClose,
  onCleared,
}: {
  open: boolean;
  onClose: () => void;
  onCleared: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClear() {
    setError(null);
    startTransition(async () => {
      const result = await clearAiUsageLog();
      if (result.error) {
        setError(result.error);
        return;
      }
      onCleared();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Clear usage log">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure? This will permanently clear the AI usage log for this workspace. The chart and detailed log
          will show no history until new AI actions are logged. This does not affect your credits used or your plan
          limit.
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
          <Button type="button" loading={isPending} onClick={handleClear} className="bg-red-600 hover:bg-red-700">
            Clear log
          </Button>
        </div>
      </div>
    </Modal>
  );
}
