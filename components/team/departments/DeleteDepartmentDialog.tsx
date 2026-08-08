"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteDepartment } from "@/lib/actions/departments";
import type { Department } from "@/lib/types";

export function DeleteDepartmentDialog({
  department,
  onClose,
  onDeleted,
}: {
  department: Department | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!department) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDepartment(department.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal open={!!department} onClose={onClose} title="Delete department">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {department?.department_name}
          </span>
          ? Its members will be unassigned from this department. This action cannot be undone.
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
