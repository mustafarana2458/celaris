import type {
  ContactsSubKey,
  DashboardKpiKey,
  DealsSubKey,
  InvoicesSubKey,
  ProjectsSubKey,
  TasksSubKey,
  TeamSubKey,
} from "@/lib/types";

export type ModuleKey =
  | "dashboard"
  | "contacts"
  | "deals"
  | "projects"
  | "tasks"
  | "invoices"
  | "team"
  | "ai_assistant"
  | "settings";

export type PermissionSubSchema<K extends string> = {
  key: K;
  label: string;
  // Whether this sub's row shows a View Only / Full Access dropdown when
  // enabled. false = plain ON/OFF toggle only (dashboard KPI widgets).
  supportsAccess: boolean;
};

export type PermissionModuleSchema<K extends string = string> = {
  key: ModuleKey;
  label: string;
  subs?: PermissionSubSchema<K>[];
};

// Mirrors nav-links.ts routes/labels. Keys are stable identifiers stored in
// workspace_members.permissions (v2 shape), independent of route paths or
// labels so renaming a nav link doesn't break saved permissions.
export const PERMISSION_MODULES: PermissionModuleSchema[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    subs: [
      { key: "contacts_kpis" satisfies DashboardKpiKey, label: "Contacts KPIs", supportsAccess: false },
      { key: "deals_kpis" satisfies DashboardKpiKey, label: "Deals KPIs", supportsAccess: false },
      { key: "revenue_kpis" satisfies DashboardKpiKey, label: "Revenue KPIs", supportsAccess: false },
    ],
  },
  {
    key: "contacts",
    label: "Contacts",
    subs: [
      { key: "people" satisfies ContactsSubKey, label: "People", supportsAccess: true },
      { key: "companies" satisfies ContactsSubKey, label: "Companies", supportsAccess: true },
      { key: "segments" satisfies ContactsSubKey, label: "Segments", supportsAccess: true },
    ],
  },
  {
    key: "deals",
    label: "Deals",
    subs: [
      { key: "pipelines" satisfies DealsSubKey, label: "Pipelines", supportsAccess: true },
      { key: "forecasts" satisfies DealsSubKey, label: "Forecasts", supportsAccess: true },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    subs: [
      { key: "all_projects" satisfies ProjectsSubKey, label: "All Projects", supportsAccess: true },
      { key: "project_templates" satisfies ProjectsSubKey, label: "Project Templates", supportsAccess: true },
      { key: "milestones" satisfies ProjectsSubKey, label: "Milestones & Timeline", supportsAccess: true },
    ],
  },
  {
    key: "tasks",
    label: "Tasks",
    subs: [
      { key: "my_tasks" satisfies TasksSubKey, label: "My Tasks", supportsAccess: true },
      { key: "team_board" satisfies TasksSubKey, label: "Team Board", supportsAccess: true },
      { key: "workload" satisfies TasksSubKey, label: "Workload", supportsAccess: true },
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    subs: [
      { key: "all_invoices" satisfies InvoicesSubKey, label: "All Invoices", supportsAccess: true },
      { key: "recurring_billing" satisfies InvoicesSubKey, label: "Recurring Billing", supportsAccess: true },
      { key: "product_library" satisfies InvoicesSubKey, label: "Product Library", supportsAccess: true },
    ],
  },
  {
    key: "team",
    label: "Team",
    subs: [
      { key: "active_members" satisfies TeamSubKey, label: "Active Members", supportsAccess: true },
      { key: "pending_invites" satisfies TeamSubKey, label: "Pending Invites", supportsAccess: true },
      { key: "team_directory" satisfies TeamSubKey, label: "Team Directory", supportsAccess: true },
      { key: "departments" satisfies TeamSubKey, label: "Departments", supportsAccess: true },
    ],
  },
  { key: "ai_assistant", label: "AI Assistant" },
  { key: "settings", label: "Settings" },
];
