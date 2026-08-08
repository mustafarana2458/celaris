"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProjectFormFields } from "./ProjectFormFields";
import { AssigneesTabs, type AssigneeJunctionRow, type DepartmentJunctionRow } from "@/components/team/AssigneesTabs";
import {
  createProject,
  updateProject,
  getProjectAssignments,
  addProjectAssignee,
  removeProjectAssignee,
  addProjectDepartment,
  removeProjectDepartment,
} from "@/lib/actions/projects";
import type { Company, Deal, Department, Project, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export function ProjectModal({
  open,
  onClose,
  project,
  onSaved,
  companies,
  deals,
  members,
  directory,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onSaved: () => void;
  companies: Pick<Company, "id" | "name">[];
  deals: Pick<Deal, "id" | "title">[];
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  departments: Department[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!project;

  const [assigneeRows, setAssigneeRows] = useState<AssigneeJunctionRow[]>([]);
  const [departmentRows, setDepartmentRows] = useState<DepartmentJunctionRow[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (!open || !project) {
      setAssigneeRows([]);
      setDepartmentRows([]);
      return;
    }
    let cancelled = false;
    setLoadingAssignments(true);
    getProjectAssignments(project.id).then((result) => {
      if (cancelled) return;
      setAssigneeRows(result.assignees);
      setDepartmentRows(result.departments);
      setLoadingAssignments(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, project]);

  function refreshAssignments() {
    if (!project) return;
    getProjectAssignments(project.id).then((result) => {
      setAssigneeRows(result.assignees);
      setDepartmentRows(result.departments);
    });
  }

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

        <ProjectFormFields
          project={project}
          companies={companies}
          deals={deals}
          members={members}
          directory={directory}
        />

        {isEdit && project && (
          <AssigneesTabs
            entityId={project.id}
            members={members}
            directory={directory}
            departments={departments}
            assigneeRows={assigneeRows}
            departmentRows={departmentRows}
            loading={loadingAssignments}
            onAddAssignee={addProjectAssignee}
            onRemoveAssignee={removeProjectAssignee}
            onAddDepartment={addProjectDepartment}
            onRemoveDepartment={removeProjectDepartment}
            onChanged={refreshAssignments}
          />
        )}

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
