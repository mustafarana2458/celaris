"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createContact, updateContact } from "@/lib/actions/contacts";
import type { Contact } from "@/lib/types";

export function ContactModal({
  open,
  onClose,
  contact,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!contact;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateContact(contact!.id, formData)
        : await createContact(formData);

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
      title={isEdit ? "Edit contact" : "Add contact"}
    >
      <form key={contact?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input label="Name" name="name" defaultValue={contact?.name} required />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={contact?.email ?? ""}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={contact?.phone ?? ""}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Company"
            name="company"
            defaultValue={contact?.company ?? ""}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className="text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={contact?.type ?? "lead"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>

        <Input
          label="Tags"
          name="tags"
          placeholder="vip, newsletter, referral"
          defaultValue={contact?.tags?.join(", ") ?? ""}
        />

        <Textarea
          label="Notes"
          name="notes"
          rows={3}
          defaultValue={contact?.notes ?? ""}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add contact"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
