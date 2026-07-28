"use client";

import { createContext, useContext, ReactNode } from "react";
import type { CurrentWorkspace } from "@/lib/workspace";

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
