"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/types";

export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: Project | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!project) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal open={!!project} onClose={onClose} title="Delete project">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">{project?.name}</span>?
          This action cannot be undone.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
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
