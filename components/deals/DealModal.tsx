"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createDeal, updateDeal } from "@/lib/actions/deals";
import { STAGES } from "./stages";
import type { Contact, Deal } from "@/lib/types";

export function DealModal({
  open,
  onClose,
  deal,
  contacts,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal | null;
  contacts: Pick<Contact, "id" | "name">[];
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!deal;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateDeal(deal!.id, formData)
        : await createDeal(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit deal" : "Add deal"}>
      <form key={deal?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input label="Title" name="title" defaultValue={deal?.title} required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_id" className="text-sm font-medium text-slate-700">
            Contact
          </label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={deal?.contact_id ?? ""}
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
            label="Value ($)"
            name="value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={deal?.value ?? ""}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stage" className="text-sm font-medium text-slate-700">
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={deal?.stage ?? "new"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Expected close date"
          name="expected_close"
          type="date"
          defaultValue={deal?.expected_close ?? ""}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
