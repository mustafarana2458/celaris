"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronDown, User, CreditCard, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { logOut } from "@/lib/actions/auth";

export function ProfileDropdown({
  fullName,
  avatarUrl,
}: {
  fullName: string;
  avatarUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const initial = firstName[0]?.toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent-hover dark:bg-accent/20 dark:text-accent">
              {initial}
            </span>
          )}
          <span className="hidden text-sm font-medium text-slate-700 sm:block dark:text-slate-300">
            {firstName}
          </span>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block dark:text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings?tab=profile">
            <User className="h-4 w-4 shrink-0" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings?tab=billing">
            <CreditCard className="h-4 w-4 shrink-0" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => startTransition(async () => { await logOut(); })}
          className="text-red-600 dark:text-red-400 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 dark:data-[highlighted]:bg-red-950/40 dark:data-[highlighted]:text-red-300"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {isPending ? "Logging out…" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
