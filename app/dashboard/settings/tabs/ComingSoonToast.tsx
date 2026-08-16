"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_DISMISS_MS = 3000;

// Shared by Integrations/Billing -- both are UI-only screens whose actions
// (Connect, Manage Subscription, ...) have nothing to actually do yet, so
// every button just surfaces this instead of wiring to a real OAuth/Stripe
// flow. One toast per tab, auto-dismisses, no external deps.
export function useComingSoonToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(text);
    timeoutRef.current = setTimeout(() => setMessage(null), AUTO_DISMISS_MS);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return { message, showToast };
}

export function ComingSoonToast({ message }: { message: string | null }) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 transition-all duration-300 ${
        message ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message && (
        <div className="pointer-events-auto rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          {message}
        </div>
      )}
    </div>
  );
}
