"use client";

import { useState } from "react";
import { Workflow, ChevronDown, Plus, Check } from "lucide-react";
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
import { createPipeline } from "@/lib/actions/pipelines";
import type { Pipeline } from "@/lib/types";

export function PipelineSwitcher({
  pipelines,
  activePipelineId,
  onSwitch,
  onCreated,
}: {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  onSwitch: (id: string) => void;
  onCreated: (pipeline: { id: string; name: string; is_default: boolean }) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const active = pipelines.find((p) => p.id === activePipelineId) ?? null;

  async function handleCreate(formData: FormData) {
    setCreating(true);
    setCreateError(null);
    const result = await createPipeline(formData);
    setCreating(false);

    if (result.error) {
      setCreateError(result.error);
      return;
    }
    if (result.pipeline) {
      onCreated(result.pipeline);
    }
    setCreateOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Switch pipeline"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Workflow className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="max-w-[10rem] truncate">{active?.name ?? "Select pipeline"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Pipelines</DropdownMenuLabel>
          {pipelines.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => onSwitch(p.id)}>
              <span className="flex-1 truncate">{p.name}</span>
              {p.is_default && (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  Default
                </span>
              )}
              {p.id === activePipelineId && (
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
            New pipeline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New pipeline">
        <form action={handleCreate} className="flex flex-col gap-4">
          {createError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {createError}
            </div>
          )}
          <Input name="name" label="Pipeline name" placeholder="e.g. Enterprise Sales" required autoFocus />
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
