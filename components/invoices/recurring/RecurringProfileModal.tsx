"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createRecurringProfile, updateRecurringProfile } from "@/lib/actions/recurringProfiles";
import { InvoiceLineItemsEditor, type LineItemDraft } from "../InvoiceLineItemsEditor";
import { RECURRING_PROFILE_FREQUENCIES } from "./profileStatuses";
import type { Contact, Product, RecurringProfile, RecurringProfileFrequency } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function defaultLineItems(profile: RecurringProfile | null): LineItemDraft[] {
  if (profile?.line_items && profile.line_items.length > 0) {
    return profile.line_items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }));
  }
  return [{ description: "", quantity: "1", unit_price: "" }];
}

export function RecurringProfileModal({
  open,
  onClose,
  profile,
  contacts,
  products,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: RecurringProfile | null;
  contacts: Pick<Contact, "id" | "name">[];
  products: Pick<Product, "id" | "name" | "unit_price">[];
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!profile;

  const [lineItems, setLineItems] = useState<LineItemDraft[]>(() => defaultLineItems(profile));
  const [taxPercent, setTaxPercent] = useState(profile ? String(profile.tax_percent) : "0");
  const [discount, setDiscount] = useState(profile ? String(profile.discount) : "0");
  const [autoSend, setAutoSend] = useState(profile?.auto_send ?? false);

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
        ? await updateRecurringProfile(profile!.id, formData)
        : await createRecurringProfile(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit recurring profile" : "Create recurring profile"}
      size="wide"
    >
      <form key={profile?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Profile name"
            name="profile_name"
            defaultValue={profile?.profile_name}
            placeholder="e.g. Monthly SEO Retainer"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Contact
            </label>
            <select
              id="contact_id"
              name="contact_id"
              defaultValue={profile?.contact_id ?? ""}
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
            <span>Total per cycle</span>
            <span>{currency.format(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="frequency" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Frequency
            </label>
            <select
              id="frequency"
              name="frequency"
              defaultValue={profile?.frequency ?? ("monthly" satisfies RecurringProfileFrequency)}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {RECURRING_PROFILE_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Start date"
            name="start_date"
            type="date"
            defaultValue={profile?.start_date ?? ""}
            required
          />
          <Input
            label="End date"
            name="end_date"
            type="date"
            defaultValue={profile?.end_date ?? ""}
          />
        </div>
        <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
          {isEdit
            ? "The next issue date isn't affected by editing the start date."
            : "The first invoice will be scheduled to generate on the start date."}
        </p>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-600">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-send</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {autoSend
                ? "Generated invoices are emailed to the client automatically."
                : "Generated invoices are saved as a draft for manual review."}
            </span>
          </span>
          <input
            type="checkbox"
            name="auto_send"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
            className="h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 dark:bg-slate-600"
          />
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create profile"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
