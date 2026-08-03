"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function BulkDeleteDialog({
  open,
  count,
  onClose,
  onConfirm,
  pending,
  error,
  title = "Delete contacts",
  itemLabel,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
  /** Modal title, e.g. "Delete companies". Defaults to "Delete contacts". */
  title?: string;
  /** Already-pluralized noun for the confirmation copy, e.g. "contact"/"contacts" or "company"/"companies". Defaults to "contact"/"contacts". */
  itemLabel?: string;
}) {
  const noun = itemLabel ?? (count === 1 ? "contact" : "contacts");
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {count} {noun}
          </span>
          ? This action cannot be undone.
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
            loading={pending}
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
