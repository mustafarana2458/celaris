"use client";

import { useTransition } from "react";
import { logOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

export function Topbar({
  fullName,
  businessName,
  onMenuClick,
}: {
  fullName: string;
  businessName: string;
  onMenuClick?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-slate-900">{businessName}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {initials}
          </span>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">
            {fullName}
          </span>
        </div>
        <form
          action={() => {
            startTransition(async () => {
              await logOut();
            });
          }}
        >
          <Button type="submit" variant="secondary" loading={isPending}>
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
