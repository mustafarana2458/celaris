"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import type { Company } from "@/lib/types";

const INDUSTRIES = ["Tech", "Finance", "Retail", "Healthcare", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "200+"];

export function CompanyModal({
  open,
  onClose,
  company,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!company;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateCompany(company!.id, formData)
        : await createCompany(formData);

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
      title={isEdit ? "Edit company" : "Add company"}
    >
      <form key={company?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input label="Company Name" name="name" defaultValue={company?.name} required />

        <Input
          label="Website URL"
          name="website"
          type="url"
          placeholder="https://example.com"
          defaultValue={company?.website ?? ""}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="industry" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Industry
            </label>
            <select
              id="industry"
              name="industry"
              defaultValue={company?.industry ?? ""}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Not specified</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="size" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Company Size
            </label>
            <select
              id="size"
              name="size"
              defaultValue={company?.size ?? ""}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Not specified</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Location / City"
          name="location"
          defaultValue={company?.location ?? ""}
        />

        <Textarea
          label="Description / Notes"
          name="notes"
          rows={3}
          defaultValue={company?.notes ?? ""}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
