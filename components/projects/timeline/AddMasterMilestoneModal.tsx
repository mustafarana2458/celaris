"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ProjectCombobox } from "./ProjectCombobox";
import { createMilestone } from "@/lib/actions/milestones";
import type { Project, WorkspaceTeamMember } from "@/lib/types";

const selectClass =
  "rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function AddMasterMilestoneModal({
  open,
  onClose,
  projects,
  members,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  projects: Pick<Project, "id" | "name">[];
  members: WorkspaceTeamMember[];
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    const title = String(formData.get("title") ?? "").trim();
    const projectId = String(formData.get("project_id") ?? "").trim();
    const dueDate = String(formData.get("due_date") ?? "").trim();
    const ownerId = String(formData.get("owner_id") ?? "").trim();
    const deliverables = String(formData.get("deliverables") ?? "").trim();

    if (!title) {
      setError("Milestone title is required.");
      return;
    }
    if (!projectId) {
      setError("Choose which project this milestone belongs to.");
      return;
    }
    if (!dueDate) {
      setError("Due date is required.");
      return;
    }

    startTransition(async () => {
      const result = await createMilestone(projectId, title, dueDate, ownerId || null, deliverables || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add milestone">
      <form key={open ? "open" : "closed"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input label="Milestone title" name="title" required />

        <ProjectCombobox projects={projects} />

        <Input label="Due date" name="due_date" type="date" required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="owner_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Milestone owner <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          </label>
          <select id="owner_id" name="owner_id" defaultValue="" className={selectClass}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name ?? m.email ?? "Unnamed"}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          label="Deliverables"
          name="deliverables"
          rows={3}
          placeholder="Notes or bullet points on what this milestone delivers... (optional)"
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Add milestone
          </Button>
        </div>
      </form>
    </Modal>
  );
}
