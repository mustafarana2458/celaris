"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "./nav-links";
import { NavIcon } from "./NavIcon";

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  function isLinkActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <nav className={`flex h-full flex-col gap-1 p-4 ${className}`}>
      <Link
        href="/dashboard"
        className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900 dark:text-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          C
        </span>
        Celaris
      </Link>

      {navLinks.map((item) => {
        if (item.type === "group") {
          const groupActive = item.children.some((child) => isLinkActive(child.href));
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <div
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium ${
                  groupActive
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </div>
              <div className="flex flex-col gap-1 pl-11">
                {item.children.map((child) => {
                  const isActive = isLinkActive(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        const isActive = isLinkActive(item.href);
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
