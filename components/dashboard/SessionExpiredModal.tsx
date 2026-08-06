"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clearInactivityState } from "@/lib/inactivity";

// Deliberately not built on the generic Modal (components/ui/Modal.tsx):
// this one can't be dismissed via Escape/backdrop click -- the only way out
// is "Login Again".
export function SessionExpiredModal({ open }: { open: boolean }) {
  const router = useRouter();

  if (!open) return null;

  function handleLoginAgain() {
    clearInactivityState();
    router.push("/login");
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-message"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-slate-950/70" />

      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 dark:bg-accent/20">
          <Clock className="h-7 w-7 text-accent-hover dark:text-accent" strokeWidth={1.75} />
        </div>

        <h2
          id="session-expired-title"
          className="mt-5 text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Session Expired
        </h2>
        <p
          id="session-expired-message"
          className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
        >
          You&apos;ve been logged out due to 4 hours of inactivity. Please log in again to
          continue.
        </p>

        <Button onClick={handleLoginAgain} className="mt-6 w-full">
          Login Again
        </Button>
      </div>
    </div>
  );
}
