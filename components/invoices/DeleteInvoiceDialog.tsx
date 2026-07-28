"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteInvoice } from "@/lib/actions/invoices";
import type { Invoice } from "@/lib/types";

export function DeleteInvoiceDialog({
  invoice,
  onClose,
  onDeleted,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!invoice) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal open={!!invoice} onClose={onClose} title="Delete invoice">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900">{invoice?.invoice_number}</span>?
          This action cannot be undone.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
