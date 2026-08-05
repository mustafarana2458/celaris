"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { ProjectCard } from "./ProjectCard";
import { ProjectsTable } from "./ProjectsTable";
import { NewProjectModal } from "./NewProjectModal";
import { ProjectModal } from "./ProjectModal";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { PROJECT_STATUSES } from "./statuses";
import type { Company, Deal, Project, WorkspaceTeamMember } from "@/lib/types";

type ViewMode = "grid" | "table";

export function ProjectsPageClient({
  initialProjects,
  companies,
  deals,
  members,
  loadError,
}: {
  initialProjects: Project[];
  companies: Pick<Company, "id" | "name">[];
  deals: Pick<Deal, "id" | "title">[];
  members: WorkspaceTeamMember[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Project["status"]>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialProjects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [initialProjects, search, statusFilter]);

  function handleAddSaved() {
    setAddOpen(false);
    router.refresh();
  }

  function handleEditSaved() {
    setEditing(null);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize the work you deliver for your clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {(["grid", "table"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === mode
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={() => setAddOpen(true)}>+ Add project</Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t load projects: {loadError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-accent text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s.value
                  ? "bg-accent text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="folder" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {initialProjects.length === 0 ? "No projects yet" : "No matching projects"}
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {initialProjects.length === 0
              ? "Add your first project to start organizing your work."
              : "Try a different search or filter."}
          </p>
          {initialProjects.length === 0 && (
            <Button onClick={() => setAddOpen(true)} className="mt-1">
              + Add project
            </Button>
          )}
        </div>
      ) : view === "table" ? (
        <ProjectsTable
          projects={filtered}
          onView={(p) => router.push(`/dashboard/projects/${p.id}`)}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onView={() => router.push(`/dashboard/projects/${p.id}`)}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </div>
      )}

      <NewProjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleAddSaved}
        companies={companies}
        deals={deals}
        members={members}
      />

      <ProjectModal
        open={!!editing}
        onClose={() => setEditing(null)}
        project={editing}
        onSaved={handleEditSaved}
        companies={companies}
        deals={deals}
        members={members}
      />

      <DeleteProjectDialog
        project={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
