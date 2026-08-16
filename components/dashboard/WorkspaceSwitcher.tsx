"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { switchWorkspace, createWorkspace } from "@/lib/actions/workspace";
import type { WorkspaceSummary } from "@/lib/workspace";

export function WorkspaceSwitcher({
  activeWorkspace,
  workspaces,
}: {
  activeWorkspace: { id: string; name: string; logoUrl: string | null } | null;
  workspaces: WorkspaceSummary[];
}) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();

  function handleSwitch(id: string) {
    if (id === activeWorkspace?.id) return;
    startTransition(async () => {
      // Full browser reload (not router.push/refresh) so every bit of
      // React state, cached data, and context tied to the old workspace is
      // wiped rather than risking stale data leaking into the new one. The
      // DB-side active-workspace update (users.last_active_workspace_id,
      // done inside switchWorkspace) must finish first or the reload could
      // land back on the old workspace.
      const result = await switchWorkspace(id);
      if (!result.error) window.location.href = "/dashboard";
    });
  }

  async function handleCreate(formData: FormData) {
    setCreating(true);
    setCreateError(null);
    const result = await createWorkspace(formData);
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    setCreateOpen(false);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={isPending}
            aria-label="Switch workspace"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-700"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-accent-hover dark:bg-accent/20 dark:text-accent">
              {activeWorkspace?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeWorkspace.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-900 sm:block dark:text-slate-100">
              {activeWorkspace?.name ?? "Select workspace"}
            </span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block dark:text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onSelect={() => handleSwitch(ws.id)}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-[11px] font-semibold text-accent-hover dark:bg-accent/20 dark:text-accent">
                {ws.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ws.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  ws.name[0]?.toUpperCase() ?? "?"
                )}
              </span>
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === activeWorkspace?.id && (
                <Check className="h-4 w-4 shrink-0 text-accent-hover dark:text-accent" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setCreateOpen(true)}
            className="text-accent-hover dark:text-accent"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Create New Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create workspace">
        <form action={handleCreate} className="flex flex-col gap-4">
          {createError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {createError}
            </div>
          )}
          <Input id="workspaceName" name="name" label="Workspace name" placeholder="Acme Inc" required autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={creating}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
