"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateMemberPermissions } from "@/lib/actions/team-invites";
import { PERMISSION_MODULES } from "./permissionsSchema";
import type { WorkspacePermissions, WorkspaceTeamMember } from "@/lib/types";

const toggleClass =
  "h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 dark:bg-slate-600";

export function EditPermissionsDrawer({
  member,
  onClose,
  onSaved,
}: {
  member: WorkspaceTeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = !!member;
  const [permissions, setPermissions] = useState<WorkspacePermissions>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setPermissions(member?.permissions ?? {});
    setError(null);
  }, [member?.user_id, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function isModuleVisible(key: string) {
    return permissions.modules?.[key] !== false;
  }

  function isSubmoduleVisible(moduleKey: string, subKey: string) {
    return permissions.submodules?.[moduleKey]?.[subKey] !== false;
  }

  function toggleModule(key: string, checked: boolean) {
    setPermissions((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: checked },
    }));
  }

  function toggleSubmodule(moduleKey: string, subKey: string, checked: boolean) {
    setPermissions((prev) => ({
      ...prev,
      submodules: {
        ...prev.submodules,
        [moduleKey]: { ...prev.submodules?.[moduleKey], [subKey]: checked },
      },
    }));
  }

  function handleSave() {
    if (!member) return;
    setError(null);
    startTransition(async () => {
      const result = await updateMemberPermissions(member.user_id, permissions);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity dark:bg-slate-950/60 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-slate-800 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Edit permissions
            {member && (
              <span className="block text-sm font-normal text-slate-500 dark:text-slate-400">
                {member.full_name || member.email}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-5">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Choose which modules this member can see. Hidden modules won&apos;t appear in their
            sidebar.
          </p>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {PERMISSION_MODULES.map((mod) => (
              <div key={mod.key} className="py-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {mod.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={isModuleVisible(mod.key)}
                    onChange={(e) => toggleModule(mod.key, e.target.checked)}
                    className={toggleClass}
                  />
                </label>

                {mod.submodules && (
                  <div className="mt-2 flex flex-col gap-2 pl-4">
                    {mod.submodules.map((sub) => (
                      <label key={sub.key} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {sub.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={isSubmoduleVisible(mod.key, sub.key)}
                          onChange={(e) => toggleSubmodule(mod.key, sub.key, e.target.checked)}
                          className={toggleClass}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isPending} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
