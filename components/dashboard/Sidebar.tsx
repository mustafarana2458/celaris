"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "./nav-links";
import { NavIcon } from "./NavIcon";

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={`flex h-full flex-col gap-1 p-4 ${className}`}>
      <Link
        href="/dashboard"
        className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          B
        </span>
        BizSuite AI
      </Link>

      {navLinks.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <NavIcon name={link.icon} className="h-5 w-5 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
