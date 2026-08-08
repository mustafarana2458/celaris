"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DepartmentCard } from "./DepartmentCard";
import { DepartmentModal } from "./DepartmentModal";
import { DeleteDepartmentDialog } from "./DeleteDepartmentDialog";
import type { Department } from "@/lib/types";

export function DepartmentsPageClient({
  departments,
  memberCounts,
  canManage,
}: {
  departments: Department[];
  memberCounts: Record<string, number>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openRename(department: Department) {
    setEditing(department);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    router.refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Departments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize workspace members into departments or groups.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>+ Create Department</Button>}
      </div>

      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <Building2 className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No departments yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {canManage
              ? "Create a department to group your team -- both active members and directory profiles."
              : "No departments have been created for this workspace yet."}
          </p>
          {canManage && (
            <Button onClick={openCreate} className="mt-1">
              + Create Department
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              memberCount={memberCounts[department.id] ?? 0}
              canManage={canManage}
              onRename={() => openRename(department)}
              onDelete={() => setDeleting(department)}
            />
          ))}
        </div>
      )}

      {canManage && (
        <>
          <DepartmentModal open={modalOpen} onClose={closeModal} department={editing} onSaved={handleSaved} />

          <DeleteDepartmentDialog
            department={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={handleDeleted}
          />
        </>
      )}
    </div>
  );
}
