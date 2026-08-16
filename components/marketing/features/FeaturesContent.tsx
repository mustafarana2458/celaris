"use client";

import { useEffect, useRef, useState } from "react";
import { ModuleMockup, type ModuleId } from "@/components/marketing/features/ModuleMockup";

type Module = {
  id: ModuleId;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
};

const MODULES: Module[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    tagline: "Overview",
    description:
      "A real-time snapshot of your business the moment you log in — revenue, deal velocity, and project health rolled into one view.",
    bullets: [
      "KPI cards — revenue, deals, projects, and invoices at a glance",
      "Activity trends — visualize performance over time with built-in charts",
      "Quick actions — jump straight into whatever needs your attention",
    ],
  },
  {
    id: "contacts",
    label: "Contacts",
    tagline: "CRM",
    description:
      "Track people and the companies they work for, keep custom fields, and segment your audience for targeted outreach.",
    bullets: [
      "People & Companies — linked contact records with company rollups",
      "Segments — save filtered views for follow-ups and campaigns",
      "Full activity history synced across deals, projects, and invoices",
    ],
  },
  {
    id: "deals",
    label: "Deals",
    tagline: "Pipeline",
    description:
      "A drag-and-drop kanban pipeline with stage-based forecasting and an AI-generated summary of what needs attention.",
    bullets: [
      "Kanban pipeline — drag deals across custom stages",
      "Forecasts — weighted revenue projections by stage",
      "AI deal summary — surface what's stalling and what's closing soon",
    ],
  },
  {
    id: "projects",
    label: "Projects",
    tagline: "Delivery",
    description:
      "Break work into milestones, track progress on a Gantt-style timeline, and start new projects from reusable templates.",
    bullets: [
      "All Projects — budget, status, and owner at a glance",
      "Templates — spin up recurring project types in seconds",
      "Milestones & Gantt timeline — visualize dependencies and deadlines",
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    tagline: "Execution",
    description:
      "Keep every task visible — your own list, your team's board, and workload balance across the whole department.",
    bullets: [
      "My Tasks — a personal, prioritized list synced across every module",
      "Team Board — a kanban view of what everyone is working on",
      "Workload — spot overloaded teammates before deadlines slip",
    ],
  },
  {
    id: "invoices",
    label: "Invoices",
    tagline: "Billing",
    description:
      "Create invoices from a shared product library, automate recurring billing, and track what's outstanding at a glance.",
    bullets: [
      "All Invoices — paid, due, and overdue in one list",
      "Recurring billing — auto-generate invoices on schedule",
      "Product library — reusable line items with consistent pricing",
    ],
  },
  {
    id: "team",
    label: "Team",
    tagline: "Access control",
    description:
      "Invite your team, organize them into departments, and control module-level permissions down to view-only or full access.",
    bullets: [
      "Role-based defaults — owner, admin, and member baselines out of the box",
      "Departments — group teammates the way your org actually works",
      "Granular permissions — per-module, per-sub-feature access control",
    ],
  },
  {
    id: "assistant",
    label: "AI Assistant",
    tagline: "AI",
    description:
      "A conversational assistant that understands your workspace — ask questions, get summaries, and let it take action through function calling.",
    bullets: [
      "Natural-language chat — query contacts, deals, and invoices in plain English",
      "Function calling — the assistant can create, update, and look up records for you",
      "Persistent memory — conversations pick up context across sessions",
    ],
  },
];

export function FeaturesContent() {
  const [activeId, setActiveId] = useState<ModuleId>(MODULES[0].id);
  const sectionRefs = useRef<Partial<Record<ModuleId, HTMLElement>>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id as ModuleId);
          }
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToModule = (id: ModuleId) => (e: React.MouseEvent) => {
    e.preventDefault();
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-start lg:gap-16 lg:py-24">
      <aside className="lg:sticky lg:top-24 lg:w-1/4 lg:shrink-0">
        <p className="hidden text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500 lg:block">
          Modules
        </p>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
          {MODULES.map((mod) => (
            <a
              key={mod.id}
              href={`#${mod.id}`}
              onClick={scrollToModule(mod.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 lg:shrink ${
                activeId === mod.id
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              {mod.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex-1 space-y-6">
        {MODULES.map((mod, i) => (
          <section
            key={mod.id}
            id={mod.id}
            ref={(el) => {
              if (el) sectionRefs.current[mod.id] = el;
            }}
            className={`scroll-mt-24 rounded-3xl px-6 py-12 lg:px-10 lg:py-16 ${
              i % 2 === 1
                ? "bg-gray-50 dark:bg-neutral-900/40"
                : "bg-white dark:bg-neutral-950"
            }`}
          >
            <div
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{mod.tagline}</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {mod.label}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-neutral-400">
                  {mod.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {mod.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm text-slate-600 dark:text-neutral-300">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ModuleMockup variant={mod.id} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
