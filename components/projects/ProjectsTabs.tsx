"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/projects", label: "All Projects" },
  { href: "/dashboard/projects/templates", label: "Templates" },
  { href: "/dashboard/projects/milestones", label: "Milestones & Timeline" },
];

export function ProjectsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-accent text-accent-hover dark:text-accent"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
