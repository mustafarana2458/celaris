"use client";

import { ReactNode, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-hidden border-r border-slate-200 bg-white md:block dark:border-slate-700 dark:bg-slate-800">
        <AdminSidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-hidden bg-white shadow-xl dark:bg-slate-800">
            <AdminSidebar />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar email={email} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
