"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createDepartment, renameDepartment } from "@/lib/actions/departments";
import type { Department } from "@/lib/types";

export function DepartmentModal({
  open,
  onClose,
  department,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  department: Department | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!department;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await renameDepartment(department!.id, formData)
        : await createDepartment(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Rename department" : "Create department"}>
      <form key={department?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Department name"
          name="department_name"
          placeholder="Marketing, Engineering, HR..."
          defaultValue={department?.department_name}
          required
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create department"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
