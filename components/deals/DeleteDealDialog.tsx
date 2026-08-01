"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteDeal } from "@/lib/actions/deals";
import type { Deal } from "@/lib/types";

export function DeleteDealDialog({
  deal,
  onClose,
  onDeleted,
}: {
  deal: Deal | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deal) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDeal(deal.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal open={!!deal} onClose={onClose} title="Delete deal">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">{deal?.title}</span>?
          This action cannot be undone.
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
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
