"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { suggestNextInvoiceNumber } from "@/lib/invoiceNumber";
import { INVOICE_STATUSES } from "./statuses";
import { InvoiceLineItemsEditor, type LineItemDraft } from "./InvoiceLineItemsEditor";
import type { Contact, Invoice, Product, Project, RecurringFrequency } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const FREQUENCIES: { value: RecurringFrequency; label: string; months: number }[] = [
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "quarterly", label: "Quarterly", months: 3 },
  { value: "yearly", label: "Yearly", months: 12 },
];

function suggestNextIssueDate(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function defaultLineItems(invoice: Invoice | null): LineItemDraft[] {
  if (invoice?.invoice_items && invoice.invoice_items.length > 0) {
    return invoice.invoice_items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }));
  }
  if (invoice && invoice.amount > 0) {
    return [{ description: "Invoice amount", quantity: "1", unit_price: String(invoice.amount) }];
  }
  return [{ description: "", quantity: "1", unit_price: "" }];
}

export function InvoiceModal({
  open,
  onClose,
  invoice,
  contacts,
  projects,
  products,
  existingInvoiceNumbers,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  contacts: Pick<Contact, "id" | "name">[];
  projects: Pick<Project, "id" | "name">[];
  products: Pick<Product, "id" | "name" | "unit_price">[];
  existingInvoiceNumbers: string[];
  onSaved: () => void;
}) {
  const isEdit = !!invoice;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit invoice" : "Add invoice"} size="wide">
      {/* Mounted only while open, and remounted fresh on every open -- this is
          what actually resets the form between one Add and the next, or fully
          repopulates it when editing a different invoice. The controlled
          state (line items, tax, discount, recurring fields) lives inside
          InvoiceForm rather than here, since InvoiceModal itself never
          unmounts between opens. */}
      {open && (
        <InvoiceForm
          key={invoice?.id ?? "new"}
          invoice={invoice}
          contacts={contacts}
          projects={projects}
          products={products}
          existingInvoiceNumbers={existingInvoiceNumbers}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function InvoiceForm({
  invoice,
  contacts,
  projects,
  products,
  existingInvoiceNumbers,
  onClose,
  onSaved,
}: {
  invoice: Invoice | null;
  contacts: Pick<Contact, "id" | "name">[];
  projects: Pick<Project, "id" | "name">[];
  products: Pick<Product, "id" | "name" | "unit_price">[];
  existingInvoiceNumbers: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!invoice;
  const suggestedInvoiceNumber = useMemo(
    () => suggestNextInvoiceNumber(existingInvoiceNumbers),
    [existingInvoiceNumbers]
  );

  const [lineItems, setLineItems] = useState<LineItemDraft[]>(() => defaultLineItems(invoice));
  const [taxPercent, setTaxPercent] = useState(invoice ? String(invoice.tax_percent) : "0");
  const [discount, setDiscount] = useState(invoice ? String(invoice.discount) : "0");
  const [isRecurring, setIsRecurring] = useState(invoice?.is_recurring ?? false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    invoice?.recurring_frequency ?? "monthly"
  );
  const [nextIssueDate, setNextIssueDate] = useState(invoice?.next_issue_date ?? "");

  const subtotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
        0
      ),
    [lineItems]
  );
  const discountValue = parseFloat(discount) || 0;
  const taxPercentValue = parseFloat(taxPercent) || 0;
  const taxableAmount = Math.max(0, subtotal - discountValue);
  const taxAmount = taxableAmount * (taxPercentValue / 100);
  const total = taxableAmount + taxAmount;

  function handleFrequencyChange(value: RecurringFrequency) {
    setFrequency(value);
    if (!nextIssueDate) {
      const months = FREQUENCIES.find((f) => f.value === value)?.months ?? 1;
      setNextIssueDate(suggestNextIssueDate(months));
    }
  }

  function handleRecurringToggle(checked: boolean) {
    setIsRecurring(checked);
    if (checked && !nextIssueDate) {
      const months = FREQUENCIES.find((f) => f.value === frequency)?.months ?? 1;
      setNextIssueDate(suggestNextIssueDate(months));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    const cleanItems = lineItems.filter((item) => item.description.trim());
    if (cleanItems.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }
    formData.set("line_items_json", JSON.stringify(cleanItems));

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
    <form action={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Invoice number"
          name="invoice_number"
          defaultValue={invoice?.invoice_number ?? suggestedInvoiceNumber}
          placeholder="INV-0001"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Contact
          </label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={invoice?.contact_id ?? ""}
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">No contact linked</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="project_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Link to Project <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
        </label>
        <select
          id="project_id"
          name="project_id"
          defaultValue={invoice?.project_id ?? ""}
          className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">No project linked</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <InvoiceLineItemsEditor items={lineItems} onChange={setLineItems} products={products} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Tax (%)"
          name="tax_percent"
          type="number"
          step="0.01"
          min="0"
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
        />
        <Input
          label="Discount ($)"
          name="discount"
          type="number"
          step="0.01"
          min="0"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 px-3.5 py-2.5 dark:bg-slate-700/40">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Subtotal</span>
          <span>{currency.format(subtotal)}</span>
        </div>
        {discountValue > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Discount</span>
            <span>-{currency.format(discountValue)}</span>
          </div>
        )}
        {taxPercentValue > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Tax ({taxPercentValue}%)</span>
            <span>{currency.format(taxAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm font-semibold text-slate-900 dark:border-slate-600 dark:text-slate-100">
          <span>Total</span>
          <span>{currency.format(total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={invoice?.status ?? "unpaid"}
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-600">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            name="is_recurring"
            checked={isRecurring}
            onChange={(e) => handleRecurringToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30 dark:border-slate-600"
          />
          Recurring invoice
        </label>

        {isRecurring && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recurring_frequency" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Frequency
              </label>
              <select
                id="recurring_frequency"
                name="recurring_frequency"
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value as RecurringFrequency)}
                className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Next issue date"
              name="next_issue_date"
              type="date"
              value={nextIssueDate}
              onChange={(e) => setNextIssueDate(e.target.value)}
            />
          </div>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Recurring invoices track a next issue date only — you&apos;ll need to generate the next
          invoice yourself for now.
        </p>
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
  );
}
