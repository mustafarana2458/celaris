"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { hasModuleAccess } from "@/lib/permissions";
import { isModuleLockedByPlan } from "@/lib/planLimits";
import { navLinks, getActiveHref, type NavGroup, type NavItem } from "./nav-links";
import { NavIcon } from "./NavIcon";
import { DevPanelModal } from "./DevPanelModal";
import { UpgradePlanModal } from "./UpgradePlanModal";
import { AiUsageWidget } from "./AiUsageWidget";
import type { AiUsageChartView } from "@/lib/types";

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const SECRET_CLICKS = 5;
const SECRET_WINDOW_MS = 2000;

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

export function Sidebar({
  className = "",
  showAiUsageWidget = true,
  initialAiUsageChartView = "daily",
}: {
  className?: string;
  showAiUsageWidget?: boolean;
  initialAiUsageChartView?: AiUsageChartView;
}) {
  const pathname = usePathname();
  const workspace = useWorkspace();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [upgradeModalLabel, setUpgradeModalLabel] = useState<string | null>(null);
  const logoClicks = useRef<number[]>([]);

  // Cosmetic mirror of the server-side route guards in lib/permissions.ts --
  // hides modules/submodules a member's permissions explicitly turned off.
  // Owners and members with no permissions set see everything, unchanged.
  const visibleNavLinks = useMemo(
    () =>
      navLinks
        .filter((item) =>
          hasModuleAccess(workspace?.role, workspace?.permissions, item.moduleKey, undefined, workspace?.modulePreferences)
        )
        .map((item) => {
          if (item.type !== "group") return item;
          return {
            ...item,
            children: item.children.filter(
              (child) =>
                !child.submoduleKey ||
                hasModuleAccess(
                  workspace?.role,
                  workspace?.permissions,
                  item.moduleKey,
                  child.submoduleKey,
                  workspace?.modulePreferences
                )
            ),
          };
        }),
    [workspace?.role, workspace?.permissions, workspace?.modulePreferences]
  );

  // Five rapid clicks on the logo opens the hidden developer panel; no
  // visible hint anywhere. Clicks 1-4 still navigate normally (a no-op if
  // already on /dashboard) -- only the qualifying 5th click is intercepted.
  function handleLogoClick(e: React.MouseEvent) {
    const now = Date.now();
    logoClicks.current = [...logoClicks.current, now].filter((t) => now - t < SECRET_WINDOW_MS);
    if (logoClicks.current.length >= SECRET_CLICKS) {
      e.preventDefault();
      logoClicks.current = [];
      setDevPanelOpen(true);
    }
  }

  const activeHref = getActiveHref(pathname);

  function isLinkActive(href: string) {
    return href === activeHref;
  }

  function groupHasActiveChild(item: NavGroup) {
    return item.children.some((child) => child.href === activeHref);
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

  // Plan-tier lock (Phase 2B) is a THIRD, separate layer from the
  // role/module-preference visibility filter above -- a locked item stays
  // in visibleNavLinks (still visible, per the boss's spec: shown with a
  // padlock, not hidden) and gets its click intercepted here instead of
  // navigating.
  function renderNavItem(item: NavItem) {
    const locked = isModuleLockedByPlan(workspace?.plan, item.moduleKey);

    if (item.type === "group") {
      const groupActive = groupHasActiveChild(item);
      const isOpen = expandedGroup === item.label;

      return (
        <div key={item.label} className="flex flex-col">
          <button
            type="button"
            onClick={() => (locked ? setUpgradeModalLabel(item.label) : toggleGroup(item.label))}
            aria-expanded={locked ? undefined : isOpen}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              locked
                ? "text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-700"
                : groupActive
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {locked ? <LockIcon className="h-4 w-4 shrink-0" /> : <ChevronIcon open={isOpen} />}
          </button>

          {!locked && (
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
          )}
        </div>
      );
    }

    if (locked) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => setUpgradeModalLabel(item.label)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-700"
        >
          <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
          <span className="flex-1">{item.label}</span>
          <LockIcon className="h-4 w-4 shrink-0" />
        </button>
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
  }

  return (
    <nav className={`flex h-full flex-col gap-1 overflow-y-auto p-4 ${className}`}>
      <Link
        href="/dashboard"
        onClick={handleLogoClick}
        className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900 dark:text-slate-100"
      >
        <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg dark:hidden" />
        <img
          src="/celaris-logo-white.png"
          alt="Celaris"
          className="hidden h-8 w-8 rounded-lg dark:block"
        />
        Celaris
      </Link>

      {/* Natural top-to-bottom flow: nav links (AI Assistant, then Settings,
          both already last in navLinks) followed directly by the AI Usage
          widget -- no bottom-pinning, so there's no gap above them. */}
      {visibleNavLinks.map(renderNavItem)}

      {showAiUsageWidget && <AiUsageWidget initialChartView={initialAiUsageChartView} />}

      <DevPanelModal open={devPanelOpen} onClose={() => setDevPanelOpen(false)} />
      <UpgradePlanModal
        open={upgradeModalLabel !== null}
        onClose={() => setUpgradeModalLabel(null)}
        moduleLabel={upgradeModalLabel ?? ""}
      />
    </nav>
  );
}
