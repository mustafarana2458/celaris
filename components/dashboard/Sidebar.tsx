"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks, type NavGroup } from "./nav-links";
import { NavIcon } from "./NavIcon";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out dark:text-slate-500 ${
        open ? "rotate-90" : ""
      }`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  function isLinkActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  function groupHasActiveChild(item: NavGroup) {
    return item.children.some((child) => isLinkActive(child.href));
  }

  // Whichever group contains the current route auto-expands, and — since
  // this is the only thing driving expandedGroup — implicitly collapses
  // whatever else was open. Manual clicks (below) do the same thing.
  useEffect(() => {
    const activeGroup = navLinks.find((item) => item.type === "group" && groupHasActiveChild(item));
    setExpandedGroup(activeGroup?.label ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(label: string) {
    setExpandedGroup((prev) => (prev === label ? null : label));
  }

  return (
    <nav className={`flex h-full flex-col gap-1 overflow-y-auto p-4 ${className}`}>
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
          const groupActive = groupHasActiveChild(item);
          const isOpen = expandedGroup === item.label;

          return (
            <div key={item.label} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                aria-expanded={isOpen}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  groupActive
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronIcon open={isOpen} />
              </button>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-4 dark:border-slate-700">
                    {item.children.map((child) => {
                      const isActive = isLinkActive(child.href);
                      return (
                        <Link
                          key={child.label}
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
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-hover dark:bg-accent/20 dark:text-accent">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
