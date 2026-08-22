"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Admin Auth Rebuild Phase 3: added the Sign out control -- there was no
// way to end an admin session at all before this (only the 8h expiry).
// Best-effort logout: even if the API call fails (network blip), still
// navigate to /admin/login so the admin isn't stuck -- the session
// itself either got revoked server-side or will simply expire on its
// own 8h clock either way; this button is a convenience, not the only
// way a session ever ends.
export function AdminTopbar({ email, onMenuClick }: { email: string; onMenuClick?: () => void }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // best-effort -- still navigate away below regardless
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm md:px-6 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Super Admin</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">{email}</span>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Back to App
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
