import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CompanyCombobox } from "@/components/contacts/CompanyCombobox";
import { DealCombobox } from "./DealCombobox";
import { PROJECT_STATUSES } from "./statuses";
import { PROJECT_HEALTHS } from "./healths";
import { buildAssigneeOptions, combinedAssigneeKey } from "@/lib/assignee";
import type { Company, Deal, Project, TeamMember, WorkspaceTeamMember } from "@/lib/types";

const selectClass =
  "rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

// Shared by NewProjectModal (add) and ProjectModal (edit) so the field set
// -- and any future change to it -- stays in exactly one place.
export function ProjectFormFields({
  project,
  companies,
  deals,
  members,
  directory,
}: {
  project: Project | null;
  companies: Pick<Company, "id" | "name">[];
  deals: Pick<Deal, "id" | "title">[];
  members: WorkspaceTeamMember[];
  directory: Pick<TeamMember, "id" | "member_name">[];
}) {
  return (
    <>
      <Input label="Name" name="name" defaultValue={project?.name} required />

      <Textarea label="Description" name="description" rows={3} defaultValue={project?.description ?? ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Status
        </label>
        <select id="status" name="status" defaultValue={project?.status ?? "active"} className={selectClass}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <CompanyCombobox
        companies={companies}
        defaultCompanyId={project?.client_id}
        defaultCompanyName={project?.companies?.name}
        label="Client"
        required
      />

      <DealCombobox
        deals={deals}
        defaultDealId={project?.deal_id}
        defaultDealTitle={project?.deals?.title}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lead_assignee" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Lead / Project Manager
        </label>
        <select
          id="lead_assignee"
          name="lead_assignee"
          defaultValue={combinedAssigneeKey(project?.lead_id, project?.lead_member_id)}
          className={selectClass}
        >
          <option value="unassigned">Unassigned</option>
          {buildAssigneeOptions(members, directory).map((o) => (
            <option key={o.key} value={o.key}>
              {o.kind === "directory" ? `${o.name} (External)` : o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Start date" name="start_date" type="date" defaultValue={project?.start_date ?? ""} />
        <Input label="Due date" name="due_date" type="date" defaultValue={project?.due_date ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Budget ($)"
          name="budget"
          type="number"
          step="0.01"
          min="0"
          defaultValue={project?.budget ?? ""}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="health" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Health
          </label>
          <select id="health" name="health" defaultValue={project?.health ?? ""} className={selectClass}>
            <option value="">Not set</option>
            {PROJECT_HEALTHS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
