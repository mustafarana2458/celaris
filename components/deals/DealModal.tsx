"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CompanyCombobox } from "@/components/contacts/CompanyCombobox";
import { ContactCombobox } from "./ContactCombobox";
import {
  createDeal,
  updateDeal,
  getDealAssignments,
  addDealAssignee,
  removeDealAssignee,
  addDealDepartment,
  removeDealDepartment,
} from "@/lib/actions/deals";
import { buildAssigneeOptions, combinedAssigneeKey } from "@/lib/assignee";
import { AssigneesTabs, type AssigneeJunctionRow, type DepartmentJunctionRow } from "@/components/team/AssigneesTabs";
import { STAGES } from "./stages";
import type { Company, Contact, Deal, Department, Pipeline, TeamMember, WorkspaceTeamMember } from "@/lib/types";

export function DealModal({
  open,
  onClose,
  deal,
  contacts,
  companies,
  pipelines,
  members,
  directory,
  departments,
  currentUserId,
  defaultPipelineId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal | null;
  contacts: Pick<Contact, "id" | "name">[];
  companies: Pick<Company, "id" | "name">[];
  pipelines: Pipeline[];
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
  departments: Department[];
  currentUserId: string;
  defaultPipelineId: string | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!deal;

  const [assigneeRows, setAssigneeRows] = useState<AssigneeJunctionRow[]>([]);
  const [departmentRows, setDepartmentRows] = useState<DepartmentJunctionRow[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (!open || !deal) {
      setAssigneeRows([]);
      setDepartmentRows([]);
      return;
    }
    let cancelled = false;
    setLoadingAssignments(true);
    getDealAssignments(deal.id).then((result) => {
      if (cancelled) return;
      setAssigneeRows(result.assignees);
      setDepartmentRows(result.departments);
      setLoadingAssignments(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, deal]);

  function refreshAssignments() {
    if (!deal) return;
    getDealAssignments(deal.id).then((result) => {
      setAssigneeRows(result.assignees);
      setDepartmentRows(result.departments);
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateDeal(deal!.id, formData)
          : await createDeal(formData);

        if (result.error) {
          setError(result.error);
          return;
        }
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit deal" : "Add deal"}>
      <form key={deal?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input label="Deal Name" name="title" defaultValue={deal?.title} required />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pipeline_id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pipeline
            </label>
            <select
              id="pipeline_id"
              name="pipeline_id"
              defaultValue={deal?.pipeline_id ?? defaultPipelineId ?? ""}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stage" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={deal?.stage ?? "new"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CompanyCombobox
            companies={companies}
            defaultCompanyId={deal?.company_id ?? null}
            defaultCompanyName={deal?.companies?.name ?? null}
          />
          <ContactCombobox
            contacts={contacts}
            defaultContactId={deal?.contact_id ?? null}
            defaultContactName={deal?.contacts?.name ?? null}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="owner_assignee" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Deal Owner
          </label>
          <select
            id="owner_assignee"
            name="owner_assignee"
            defaultValue={
              deal
                ? combinedAssigneeKey(deal.owner_id, deal.owner_member_id)
                : combinedAssigneeKey(currentUserId, null)
            }
            className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="unassigned">Unassigned</option>
            {buildAssigneeOptions(members, directory).map((o) => (
              <option key={o.key} value={o.key}>
                {o.kind === "directory" ? `${o.name} (External)` : o.name}
              </option>
            ))}
          </select>
        </div>

        {isEdit && deal && (
          <AssigneesTabs
            entityId={deal.id}
            members={members}
            directory={directory}
            departments={departments}
            assigneeRows={assigneeRows}
            departmentRows={departmentRows}
            loading={loadingAssignments}
            onAddAssignee={addDealAssignee}
            onRemoveAssignee={removeDealAssignee}
            onAddDepartment={addDealDepartment}
            onRemoveDepartment={removeDealDepartment}
            onChanged={refreshAssignments}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Value ($)"
            name="value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={deal?.value ?? ""}
          />
          <Input
            label="Win Probability (%)"
            name="win_probability"
            type="number"
            step="1"
            min="0"
            max="100"
            defaultValue={deal?.win_probability ?? ""}
          />
        </div>

        <Input
          label="Expected close date"
          name="expected_close"
          type="date"
          defaultValue={deal?.expected_close ?? ""}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
