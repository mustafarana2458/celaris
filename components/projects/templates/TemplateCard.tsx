import { LayoutTemplate, Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { tagColor } from "@/lib/tagColors";

export type TemplateCardData = {
  id: string;
  name: string;
  description: string | null;
  isBuiltIn: boolean;
  durationLabel: string | null;
  taskCount: number;
};

export function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: TemplateCardData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = tagColor(template.name);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      <div className={`h-1.5 ${colors.dot}`} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.badge}`}>
              <LayoutTemplate className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
              {template.isBuiltIn && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Built-in
                </span>
              )}
            </div>
          </div>
          {!template.isBuiltIn && (
            <RowActionsMenu
              ariaLabel="Template actions"
              actions={[
                { label: "Edit", onClick: onEdit, icon: Pencil },
                { label: "Delete", onClick: onDelete, icon: Trash2, destructive: true },
              ]}
            />
          )}
        </div>

        {template.description && (
          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {template.durationLabel && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {template.durationLabel}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {template.taskCount} task{template.taskCount === 1 ? "" : "s"} included
          </span>
        </div>
      </div>
    </div>
  );
}
