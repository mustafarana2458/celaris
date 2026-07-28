"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { INVOICE_STATUSES } from "./statuses";
import type { Contact, Invoice } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function InvoiceModal({
  open,
  onClose,
  invoice,
  contacts,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  contacts: Pick<Contact, "id" | "name">[];
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : "");
  const [tax, setTax] = useState(invoice ? String(invoice.tax) : "0");
  const isEdit = !!invoice;

  const total = (parseFloat(amount) || 0) + (parseFloat(tax) || 0);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateInvoice(invoice!.id, formData)
        : await createInvoice(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit invoice" : "Add invoice"}>
      <form key={invoice?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Invoice number"
          name="invoice_number"
          defaultValue={invoice?.invoice_number}
          placeholder="INV-0001"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_id" className="text-sm font-medium text-slate-700">
            Contact
          </label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={invoice?.contact_id ?? ""}
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">No contact linked</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Amount ($)"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Tax ($)"
            name="tax"
            type="number"
            step="0.01"
            min="0"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5">
          <span className="text-sm font-medium text-slate-600">Total</span>
          <span className="text-sm font-semibold text-slate-900">{currency.format(total)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={invoice?.status ?? "unpaid"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {INVOICE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Due date"
            name="due_date"
            type="date"
            defaultValue={invoice?.due_date ?? ""}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
