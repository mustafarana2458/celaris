import Link from "next/link";
import { Building2, Eye, Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { tagColor } from "@/lib/tagColors";
import type { Department } from "@/lib/types";

export function DepartmentCard({
  department,
  memberCount,
  canManage,
  onRename,
  onDelete,
}: {
  department: Department;
  memberCount: number;
  canManage: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  const colors = tagColor(department.department_name);
  const href = `/dashboard/team/departments/${department.id}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      <div className={`h-1.5 ${colors.dot}`} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.badge}`}>
              <Building2 className="h-4 w-4" />
            </span>
            <Link href={href} className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 hover:text-accent-hover dark:text-slate-100 dark:hover:text-accent">
                {department.department_name}
              </p>
            </Link>
          </div>
          {canManage && (
            <RowActionsMenu
              ariaLabel="Department actions"
              actions={[
                { label: "Rename", onClick: onRename, icon: Pencil },
                { label: "Delete", onClick: onDelete, icon: Trash2, destructive: true },
              ]}
            />
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </span>
          <Link
            href={href}
            className="flex items-center gap-1 text-xs font-medium text-accent-hover hover:underline dark:text-accent"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
