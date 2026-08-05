"use client";

import { useEffect } from "react";
import { DealAiSummaryPanel } from "./DealAiSummaryPanel";
import type { Deal } from "@/lib/types";

export function AiSummarySheet({
  deal,
  onClose,
  onUpdated,
}: {
  deal: Deal | null;
  onClose: () => void;
  onUpdated: (patch: Partial<Deal> & { id: string }) => void;
}) {
  const open = !!deal;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity dark:bg-slate-950/60 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-slate-800 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden>✨</span>
            {deal?.title ?? "AI Summary"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {deal && <DealAiSummaryPanel deal={deal} onUpdated={onUpdated} variant="spacious" />}
        </div>
      </div>
    </div>
  );
}
