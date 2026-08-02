"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createProject } from "@/lib/actions/projects";
import { PROJECT_STATUSES } from "./statuses";
import { PROJECT_TEMPLATES } from "@/lib/projectTemplates";

export function NewProjectModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState("blank");

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("template_id", templateId === "blank" ? "" : templateId);
    startTransition(async () => {
      const result = await createProject(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add project">
      <form action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Template</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTemplateId("blank")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                templateId === "blank"
                  ? "border-accent bg-accent/5 dark:bg-accent/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Blank project</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Start from scratch.</p>
            </button>
            {PROJECT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  templateId === t.id
                    ? "border-accent bg-accent/5 dark:bg-accent/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                }`}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {t.milestones.length} milestones · {t.tasks.length} tasks
                </p>
              </button>
            ))}
          </div>
        </div>

        <Input label="Name" name="name" required />

        <Textarea label="Description" name="description" rows={3} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue="active"
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Add project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
