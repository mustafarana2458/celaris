"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { ADMIN_NAV_ITEMS } from "./admin-nav";

export function AdminSidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={`flex h-full flex-col gap-1 overflow-y-auto p-4 ${className}`}>
      <Link
        href="/admin"
        className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900 dark:text-slate-100"
      >
        <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg dark:hidden" />
        <img src="/celaris-logo-white.png" alt="Celaris" className="hidden h-8 w-8 rounded-lg dark:block" />
        <span className="flex items-center gap-1.5">
          Celaris
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-hover dark:bg-accent/20 dark:text-accent">
            Admin
          </span>
        </span>
      </Link>

      {ADMIN_NAV_ITEMS.map((item) => {
        // "/admin" itself (Overview) would match every other item's
        // startsWith check too, so it needs an exact-match rule; every
        // other section can safely use a prefix match.
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
