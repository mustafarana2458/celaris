"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateMemberPermissions } from "@/lib/actions/team-invites";
import { normalizePermissions } from "@/lib/permissions";
import { PERMISSION_MODULES, type ModuleKey } from "./permissionsSchema";
import type { PermissionAccess, WorkspacePermissions, WorkspaceTeamMember } from "@/lib/types";

const toggleClass =
  "h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 dark:bg-slate-600";

const selectClass =
  "shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300";

// A module's stored value shape, generalized across the three module kinds
// (access-gated subs, toggle-only subs, or no subs at all) so the drawer can
// read/update any module through one set of helpers. The cast at each call
// site is safe because PERMISSION_MODULES (the render schema) and
// WorkspacePermissions (the v2 type) are hand-kept in sync -- see
// permissionsSchema.ts.
type GenericModuleValue = {
  enabled: boolean;
  subs?: Record<string, { enabled: boolean; access?: PermissionAccess }>;
};

function getModule(permissions: WorkspacePermissions, moduleKey: ModuleKey): GenericModuleValue {
  return permissions[moduleKey] as GenericModuleValue;
}

function toggleModule(
  permissions: WorkspacePermissions,
  moduleKey: ModuleKey,
  enabled: boolean
): WorkspacePermissions {
  return {
    ...permissions,
    [moduleKey]: { ...getModule(permissions, moduleKey), enabled },
  } as WorkspacePermissions;
}

function toggleSub(
  permissions: WorkspacePermissions,
  moduleKey: ModuleKey,
  subKey: string,
  enabled: boolean
): WorkspacePermissions {
  const mod = getModule(permissions, moduleKey);
  if (!mod.subs) return permissions;
  return {
    ...permissions,
    [moduleKey]: {
      ...mod,
      subs: { ...mod.subs, [subKey]: { ...mod.subs[subKey], enabled } },
    },
  } as WorkspacePermissions;
}

function setSubAccess(
  permissions: WorkspacePermissions,
  moduleKey: ModuleKey,
  subKey: string,
  access: PermissionAccess
): WorkspacePermissions {
  const mod = getModule(permissions, moduleKey);
  const currentSub = mod.subs?.[subKey];
  if (!mod.subs || !currentSub) return permissions;
  return {
    ...permissions,
    [moduleKey]: {
      ...mod,
      subs: { ...mod.subs, [subKey]: { ...currentSub, access } },
    },
  } as WorkspacePermissions;
}

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
  const [permissions, setPermissions] = useState<WorkspacePermissions>(() => normalizePermissions(null));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset only when switching members or opening -- intentionally excludes
  // member.permissions so editing state isn't clobbered by parent re-renders
  // while the drawer is open (matches the previous drawer's behavior).
  useEffect(() => {
    if (!open) return;
    setPermissions(normalizePermissions(member?.permissions));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.user_id, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
            Choose which modules and pages this member can see, and whether they can edit or only
            view each one. Hidden modules won&apos;t appear in their sidebar.
          </p>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {PERMISSION_MODULES.map((mod) => {
              const modState = getModule(permissions, mod.key);
              return (
                <div key={mod.key} className="py-3">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {mod.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={modState.enabled}
                      onChange={(e) =>
                        setPermissions((prev) => toggleModule(prev, mod.key, e.target.checked))
                      }
                      className={toggleClass}
                    />
                  </label>

                  {mod.subs && (
                    <div
                      className={`mt-2 flex flex-col gap-2 pl-4 transition-opacity ${
                        modState.enabled ? "" : "opacity-40"
                      }`}
                    >
                      {mod.subs.map((sub) => {
                        const subState = modState.subs?.[sub.key];
                        const subEnabled = subState?.enabled ?? true;
                        return (
                          <div key={sub.key} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {sub.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {sub.supportsAccess && (
                                <select
                                  value={subState?.access ?? "full"}
                                  disabled={!subEnabled}
                                  onChange={(e) =>
                                    setPermissions((prev) =>
                                      setSubAccess(
                                        prev,
                                        mod.key,
                                        sub.key,
                                        e.target.value as PermissionAccess
                                      )
                                    )
                                  }
                                  className={selectClass}
                                >
                                  <option value="full">Full Access</option>
                                  <option value="view">View Only</option>
                                </select>
                              )}
                              <input
                                type="checkbox"
                                checked={subEnabled}
                                onChange={(e) =>
                                  setPermissions((prev) =>
                                    toggleSub(prev, mod.key, sub.key, e.target.checked)
                                  )
                                }
                                className={toggleClass}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
