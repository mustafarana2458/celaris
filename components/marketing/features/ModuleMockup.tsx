import { ReactNode } from "react";

export type ModuleId =
  | "dashboard"
  | "contacts"
  | "deals"
  | "projects"
  | "tasks"
  | "invoices"
  | "team"
  | "assistant";

// Shared window-chrome frame -- same visual language as DashboardMockup /
// AuthShowcase. High-fidelity CSS placeholder; swap the body for a real
// <img> per module once screenshots exist.
function MockupFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-neutral-800">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DashboardMockupBody() {
  const kpis = [
    { color: "bg-blue-500/70" },
    { color: "bg-emerald-500/70" },
    { color: "bg-purple-500/70" },
    { color: "bg-amber-500/70" },
  ];
  const bars = [35, 55, 40, 70, 50, 85, 60, 75];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-100 bg-gray-50 p-2 dark:border-neutral-800 dark:bg-neutral-800/60"
          >
            <div className="h-1.5 w-8 rounded bg-gray-300 dark:bg-neutral-600" />
            <div className={`mt-1.5 h-2.5 w-10 rounded ${kpi.color}`} />
          </div>
        ))}
      </div>
      <div className="flex h-20 items-end gap-1.5 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-blue-500/70" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function ContactsMockup() {
  const rows = [
    { color: "bg-blue-500/70", tag: "Lead" },
    { color: "bg-emerald-500/70", tag: "Customer" },
    { color: "bg-blue-500/70", tag: "Lead" },
    { color: "bg-emerald-500/70", tag: "Customer" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60"
        >
          <div className={`h-8 w-8 shrink-0 rounded-full ${row.color}`} />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-24 rounded bg-gray-300 dark:bg-neutral-600" />
            <div className="mt-1.5 h-2 w-16 rounded bg-gray-200 dark:bg-neutral-700" />
          </div>
          <span className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 dark:bg-neutral-700 dark:text-neutral-300">
            {row.tag}
          </span>
        </div>
      ))}
    </div>
  );
}

function DealsMockup() {
  const columns = [
    { title: "New", dotColor: "bg-slate-400/70", deals: 2 },
    { title: "Negotiation", dotColor: "bg-blue-500/70", deals: 1 },
    { title: "Closed Won", dotColor: "bg-emerald-500/70", deals: 2 },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map((col) => (
        <div key={col.title} className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${col.dotColor}`} />
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
              {col.title}
            </span>
          </div>
          {Array.from({ length: col.deals }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/60"
            >
              <div className="h-2 w-3/4 rounded bg-gray-300 dark:bg-neutral-600" />
              <div className={`mt-2 h-2.5 w-10 rounded ${col.dotColor}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProjectsMockup() {
  const rows = [
    { w: "60%", color: "bg-blue-500/70" },
    { w: "40%", color: "bg-purple-500/70" },
    { w: "80%", color: "bg-emerald-500/70" },
    { w: "25%", color: "bg-amber-500/70" },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-2 w-16 shrink-0 rounded bg-gray-200 dark:bg-neutral-700" />
          <div className="h-3 flex-1 rounded-full bg-gray-100 dark:bg-neutral-800">
            <div className={`h-3 rounded-full ${row.color}`} style={{ width: row.w }} />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-neutral-800">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0 text-emerald-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <div className="h-2 w-32 rounded bg-gray-300 dark:bg-neutral-600" />
      </div>
    </div>
  );
}

function InvoicesMockup() {
  const statuses = [
    { label: "Paid", cls: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" },
    { label: "Due", cls: "text-amber-600 bg-amber-500/10 dark:text-amber-400" },
    { label: "Overdue", cls: "text-red-600 bg-red-500/10 dark:text-red-400" },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-2 space-y-2">
        {statuses.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/60"
          >
            <div className="h-2 w-10 rounded bg-gray-300 dark:bg-neutral-600" />
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${s.cls}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="col-span-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
        <div className="h-2.5 w-20 rounded bg-gray-300 dark:bg-neutral-600" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-2 w-20 rounded bg-gray-200 dark:bg-neutral-700" />
              <div className="h-2 w-8 rounded bg-gray-300 dark:bg-neutral-600" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-neutral-700">
          <div className="h-2.5 w-8 rounded bg-gray-300 dark:bg-neutral-600" />
          <div className="h-3 w-14 rounded bg-blue-500/70" />
        </div>
      </div>
    </div>
  );
}

function TeamMockup() {
  const members = [
    { color: "bg-blue-500/70", role: "Owner" },
    { color: "bg-purple-500/70", role: "Admin" },
    { color: "bg-emerald-500/70", role: "Member" },
    { color: "bg-amber-500/70", role: "Member" },
  ];
  return (
    <div className="space-y-2">
      {members.map((m, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60"
        >
          <div className={`h-8 w-8 shrink-0 rounded-full ${m.color}`} />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-28 rounded bg-gray-300 dark:bg-neutral-600" />
            <div className="mt-1.5 h-2 w-14 rounded bg-gray-200 dark:bg-neutral-700" />
          </div>
          <span className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 dark:bg-neutral-700 dark:text-neutral-300">
            {m.role}
          </span>
        </div>
      ))}
    </div>
  );
}

function TasksMockup() {
  const tasks = [
    { done: true, w: "w-3/4" },
    { done: false, w: "w-1/2" },
    { done: false, w: "w-2/3" },
    { done: true, w: "w-1/3" },
  ];
  return (
    <div className="space-y-2">
      {tasks.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60"
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
              t.done ? "bg-emerald-500/70" : "border border-gray-300 dark:border-neutral-600"
            }`}
          >
            {t.done && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-2.5 w-2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </span>
          <div className={`h-2 ${t.w} rounded bg-gray-300 dark:bg-neutral-600`} />
        </div>
      ))}
    </div>
  );
}

function AssistantMockup() {
  const messages: { from: "user" | "ai"; w: string }[] = [
    { from: "user", w: "w-2/3" },
    { from: "ai", w: "w-full" },
    { from: "user", w: "w-1/2" },
  ];
  return (
    <div className="space-y-2.5">
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`h-6 ${m.w} max-w-[80%] rounded-2xl ${
              m.from === "user" ? "bg-blue-500/70" : "bg-gray-100 dark:bg-neutral-800"
            }`}
          />
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/60">
        <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-neutral-700" />
        <span className="h-5 w-5 shrink-0 rounded bg-blue-500/70" />
      </div>
    </div>
  );
}

const BODIES: Record<ModuleId, () => ReactNode> = {
  dashboard: DashboardMockupBody,
  contacts: ContactsMockup,
  deals: DealsMockup,
  projects: ProjectsMockup,
  tasks: TasksMockup,
  invoices: InvoicesMockup,
  team: TeamMockup,
  assistant: AssistantMockup,
};

export function ModuleMockup({ variant }: { variant: ModuleId }) {
  const Body = BODIES[variant];
  return (
    <div aria-hidden="true">
      <MockupFrame>
        <Body />
      </MockupFrame>
    </div>
  );
}
