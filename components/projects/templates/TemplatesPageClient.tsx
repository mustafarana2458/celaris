"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProjectsTabs } from "@/components/projects/ProjectsTabs";
import { TemplateCard, type TemplateCardData } from "./TemplateCard";
import { TemplateBuilderModal } from "./TemplateBuilderModal";
import { DeleteTemplateDialog } from "./DeleteTemplateDialog";
import { PROJECT_TEMPLATES } from "@/lib/projectTemplates";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import type { ProjectTemplateRecord } from "@/lib/types";

function formatDuration(days: number | null): string | null {
  if (days == null || days <= 0) return null;
  if (days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} Week${weeks > 1 ? "s" : ""}`;
  }
  return `${days} Day${days === 1 ? "" : "s"}`;
}

function builtInCardData(): TemplateCardData[] {
  return PROJECT_TEMPLATES.map((t) => {
    const maxDueInDays = t.milestones.reduce((max, m) => Math.max(max, m.dueInDays), 0);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      isBuiltIn: true,
      durationLabel: formatDuration(maxDueInDays),
      taskCount: t.tasks.length,
    };
  });
}

function dbCardData(templates: ProjectTemplateRecord[]): TemplateCardData[] {
  return templates.map((t) => {
    const fallbackDays = t.structure.milestones.reduce((max, m) => Math.max(max, m.dueInDays), 0);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      isBuiltIn: false,
      durationLabel: formatDuration(t.estimated_duration_days ?? fallbackDays),
      taskCount: t.structure.milestones.reduce((sum, m) => sum + m.tasks.length, 0),
    };
  });
}

export function TemplatesPageClient({
  initialTemplates,
  loadError,
}: {
  initialTemplates: ProjectTemplateRecord[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const canEdit = useCanEdit("projects", "project_templates");
  const [templates, setTemplates] = useState(initialTemplates);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTemplateRecord | null>(null);
  const [deleting, setDeleting] = useState<ProjectTemplateRecord | null>(null);

  const cards = useMemo(() => [...builtInCardData(), ...dbCardData(templates)], [templates]);
  const dbById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  function openCreate() {
    setEditing(null);
    setBuilderOpen(true);
  }

  function openEdit(id: string) {
    const template = dbById.get(id);
    if (!template) return; // built-in templates have no meatball menu, shouldn't reach here
    setEditing(template);
    setBuilderOpen(true);
  }

  function closeBuilder() {
    setBuilderOpen(false);
    setEditing(null);
  }

  function handleSaved(template: ProjectTemplateRecord) {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === template.id);
      return exists ? prev.map((t) => (t.id === template.id ? template : t)) : [...prev, template];
    });
    closeBuilder();
    router.refresh();
  }

  function handleDeleted() {
    if (deleting) {
      setTemplates((prev) => prev.filter((t) => t.id !== deleting.id));
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectsTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Project Templates</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reusable milestone & task blueprints for new projects.
          </p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ Create Template</Button>}
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Couldn&apos;t load templates: {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <TemplateCard
            key={card.id}
            template={card}
            onEdit={() => openEdit(card.id)}
            onDelete={() => {
              const template = dbById.get(card.id);
              if (template) setDeleting(template);
            }}
            canEdit={canEdit}
          />
        ))}
      </div>

      <TemplateBuilderModal open={builderOpen} onClose={closeBuilder} template={editing} onSaved={handleSaved} />

      <DeleteTemplateDialog template={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />
    </div>
  );
}
