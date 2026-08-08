"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { getInitials } from "@/lib/avatar";
import { tagColor } from "@/lib/tagColors";
import { resolveAssigneeDisplay } from "@/lib/assignee";
import { removeDepartmentMember } from "@/lib/actions/departments";
import type { DepartmentMember } from "@/lib/types";

export function DepartmentMembersList({
  departmentId,
  members,
  canManage,
  onRemoved,
}: {
  departmentId: string;
  members: DepartmentMember[];
  canManage: boolean;
  onRemoved: (id: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(member: DepartmentMember) {
    setError(null);
    setRemovingId(member.id);
    startTransition(async () => {
      const result = await removeDepartmentMember(member.id, departmentId);
      setRemovingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onRemoved(member.id);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          No members in this department yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {members.map((member) => {
              const display = resolveAssigneeDisplay(member.user, member.team_member);
              if (!display) return null;
              return (
                <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${tagColor(display.name).dot} ${
                        display.isExternal
                          ? "ring-2 ring-dashed ring-offset-1 ring-slate-400 dark:ring-offset-slate-800 dark:ring-slate-500"
                          : ""
                      }`}
                    >
                      {getInitials(display.name)}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {display.name}
                    </span>
                    {display.isExternal && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        External
                      </span>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      disabled={isPending && removingId === member.id}
                      aria-label={`Remove ${display.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
