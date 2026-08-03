"use client";

import type { ComponentType } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";

export type RowAction = {
  label: string;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  destructive?: boolean;
};

// Generic "..." row-actions menu shared by the People and Companies tables
// (and anywhere else a table row needs a couple of callback-driven actions)
// so neither table hand-rolls its own dropdown.
export function RowActionsMenu({ actions, ariaLabel }: { actions: RowAction[]; ariaLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onSelect={action.onClick}
            className={
              action.destructive
                ? "text-red-600 dark:text-red-400 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 dark:data-[highlighted]:bg-red-950/40 dark:data-[highlighted]:text-red-300"
                : undefined
            }
          >
            {action.icon && <action.icon className="h-4 w-4 shrink-0" />}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
