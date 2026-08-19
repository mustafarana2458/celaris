"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SIZE_CLASS = {
  default: "max-w-lg",
  wide: "max-w-3xl",
};

export function Modal({
  open,
  onClose,
  title,
  size = "default",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "default" | "wide";
  children: ReactNode;
}) {
  // Rendered via a portal straight to document.body (below) rather than
  // inline where the caller happens to sit in the tree. Some callers (e.g.
  // DevPanelModal, opened from Sidebar) live inside an ancestor with its
  // own stacking context -- the dashboard sidebar `<aside>` is `sticky`,
  // which per spec always creates one, and `sticky`/`fixed`/`absolute`
  // descendants painted inside it stack *within* that context rather than
  // above the whole page. A `fixed inset-0 z-50` div nested in there is not
  // guaranteed to paint above unrelated positioned content elsewhere on the
  // page (e.g. a chart/animation in <main>) -- exactly the bug that showed
  // up as a purple dashboard element painting over the modal. Portaling to
  // document.body sidesteps every ancestor's stacking context entirely,
  // which is more robust than chasing a bigger z-index number that could
  // just as easily lose to the next positioned ancestor someone adds.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60" onClick={onClose} />
      <div className={`relative flex max-h-[90vh] w-full flex-col rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 ${SIZE_CLASS[size]}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
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
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
