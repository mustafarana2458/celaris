"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type BreadcrumbContextValue = {
  extraLabel: string | null;
  setExtraLabel: (label: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

// Lets a detail page (e.g. a single project) hand its display name up to
// AutoBreadcrumb, which renders in the shared DashboardShell above
// {children} and has no other way to know a dynamic route's real name.
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extraLabel, setExtraLabel] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ extraLabel, setExtraLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbContext must be used within a BreadcrumbProvider");
  }
  return ctx;
}

// Drop this into a detail page/client component to extend the auto
// breadcrumb with a third, dynamic level -- e.g. <SetBreadcrumbLabel
// label={project.name} /> turns "Projects > All Projects" into
// "Projects > All Projects > PixelForge Website".
export function SetBreadcrumbLabel({ label }: { label: string }) {
  const { setExtraLabel } = useBreadcrumbContext();

  useEffect(() => {
    setExtraLabel(label);
    return () => setExtraLabel(null);
  }, [label, setExtraLabel]);

  return null;
}
