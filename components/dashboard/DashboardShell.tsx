"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({
  fullName,
  businessName,
  children,
}: {
  fullName: string;
  businessName: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block dark:border-slate-700 dark:bg-slate-800">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl dark:bg-slate-800">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          fullName={fullName}
          businessName={businessName}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
