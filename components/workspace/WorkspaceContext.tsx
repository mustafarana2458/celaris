"use client";

import { createContext, useContext, ReactNode } from "react";
import type { CurrentWorkspace } from "@/lib/workspace";
import { canEditModule } from "@/lib/permissions";
import type { AccessModuleKey, WorkspacePermissions } from "@/lib/types";

const WorkspaceContext = createContext<CurrentWorkspace | null | undefined>(
  undefined
);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: CurrentWorkspace | null;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (ctx === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

// UX-only check for hiding/disabling Add/Edit/Delete controls -- the real
// gate is requireFullAccess() in the corresponding server action.
export function useCanEdit<K extends AccessModuleKey>(
  moduleKey: K,
  submoduleKey: Extract<keyof WorkspacePermissions[K]["subs"], string>
): boolean {
  const workspace = useWorkspace();
  return canEditModule(workspace, moduleKey, submoduleKey);
}
