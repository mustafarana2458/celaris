"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProjectFormFields } from "./ProjectFormFields";
import { createProject, updateProject } from "@/lib/actions/projects";
import type { Company, Deal, Project, WorkspaceTeamMember } from "@/lib/types";

export function ProjectModal({
  open,
  onClose,
  project,
  onSaved,
  companies,
  deals,
  members,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onSaved: () => void;
  companies: Pick<Company, "id" | "name">[];
  deals: Pick<Deal, "id" | "title">[];
  members: WorkspaceTeamMember[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!project;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateProject(project!.id, formData)
        : await createProject(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit project" : "Add project"}>
      <form key={project?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <ProjectFormFields project={project} companies={companies} deals={deals} members={members} />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
