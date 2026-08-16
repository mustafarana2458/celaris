"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateModulePreferences } from "@/lib/actions/settings";
import { normalizeModulePreferences } from "@/lib/permissions";
import { PERMISSION_MODULES } from "@/components/team/permissionsSchema";
import type { CurrentWorkspace } from "@/lib/workspace";
import type { NormalizedModulePreferences } from "@/lib/types";

// Same schema the per-member Edit Permissions drawer renders from, minus
// "dashboard"/"settings" -- those are core and can't be toggled off at the
// workspace level (see normalizeModulePreferences()).
const MODULES = PERMISSION_MODULES.filter((mod) => mod.key !== "dashboard" && mod.key !== "settings");

const toggleClass =
  "h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-600";

type ModulesState = NormalizedModulePreferences["modules"];

export function ModulePreferencesTab({ workspace }: { workspace: CurrentWorkspace | null }) {
  const initial = normalizeModulePreferences(workspace?.modulePreferences).modules;
  const [modules, setModules] = useState<ModulesState>(initial);
  const [saved, setSaved] = useState<ModulesState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty = JSON.stringify(modules) !== JSON.stringify(saved);

  function toggleModule(key: string, enabled: boolean) {
    setModules((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }));
  }

  function toggleSub(moduleKey: string, subKey: string, enabled: boolean) {
    setModules((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], subs: { ...prev[moduleKey].subs, [subKey]: enabled } },
    }));
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateModulePreferences({ modules });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(modules);
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Module Preferences</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enable or disable CRM modules and their submodules per workspace.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-400">
          Module preferences updated successfully.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {MODULES.map((mod) => {
          const modState = modules[mod.key];
          if (!modState) return null;
          return (
            <div
              key={mod.key}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
            >
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{mod.label}</span>
                <input
                  type="checkbox"
                  checked={modState.enabled}
                  onChange={(e) => toggleModule(mod.key, e.target.checked)}
                  className={toggleClass}
                />
              </label>

              {mod.subs && mod.subs.length > 0 && (
                <div
                  className={`mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-700 ${
                    modState.enabled ? "" : "opacity-40"
                  }`}
                >
                  {mod.subs.map((sub) => (
                    <div key={sub.key} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600 dark:text-slate-300">{sub.label}</span>
                      <input
                        type="checkbox"
                        checked={modState.subs[sub.key] ?? true}
                        disabled={!modState.enabled}
                        onChange={(e) => toggleSub(mod.key, sub.key, e.target.checked)}
                        className={toggleClass}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button type="button" loading={isPending} disabled={!isDirty || isPending} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
