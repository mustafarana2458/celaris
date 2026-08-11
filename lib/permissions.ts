import { redirect } from "next/navigation";
import type { CurrentWorkspace } from "./workspace";
import type {
  AccessModuleKey,
  ContactsSubKey,
  DashboardKpiKey,
  DealsSubKey,
  InvoicesSubKey,
  ModuleWithAccessSubs,
  ModuleWithToggleSubs,
  ProjectsSubKey,
  SimpleModule,
  SubPermission,
  TasksSubKey,
  TeamSubKey,
  ToggleSubPermission,
  WorkspacePermissions,
} from "./types";

// Single source of truth for module/submodule visibility, used by both the
// sidebar (cosmetic) and route guards (actual enforcement). Owners are
// always exempt. Runs everything through normalizePermissions() first so
// missing/legacy/partial data always resolves to the same safe defaults
// (enabled=true) used everywhere else -- only an explicit `enabled: false`
// hides something.
export function hasModuleAccess(
  role: string | null | undefined,
  permissions: WorkspacePermissions | null | undefined,
  moduleKey: string,
  submoduleKey?: string
): boolean {
  if (role === "owner") return true;

  const normalized = normalizePermissions(permissions) as unknown as Record<
    string,
    { enabled: boolean; subs?: Record<string, { enabled: boolean }> }
  >;
  const mod = normalized[moduleKey];
  if (!mod) return true;
  if (!mod.enabled) return false;
  if (submoduleKey && mod.subs?.[submoduleKey]?.enabled === false) return false;
  return true;
}

// Server-side route guard for page/layout components that have already
// resolved `workspace` via getCurrentWorkspace(). Redirects to /dashboard
// when access is denied. Don't use this on the /dashboard page itself --
// that would redirect to itself; check hasModuleAccess() there instead.
export function requireModuleAccess(
  workspace: CurrentWorkspace | null,
  moduleKey: string,
  submoduleKey?: string
) {
  if (!workspace) return;
  if (!hasModuleAccess(workspace.role, workspace.permissions, moduleKey, submoduleKey)) {
    redirect("/dashboard");
  }
}

function normAccessSub(raw: unknown): SubPermission {
  const r = (raw && typeof raw === "object" ? raw : {}) as { enabled?: unknown; access?: unknown };
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : true,
    access: r.access === "view" ? "view" : "full",
  };
}

function normToggleSub(raw: unknown): ToggleSubPermission {
  const r = (raw && typeof raw === "object" ? raw : {}) as { enabled?: unknown };
  return { enabled: typeof r.enabled === "boolean" ? r.enabled : true };
}

function normModuleWithAccessSubs<K extends string>(
  raw: unknown,
  subKeys: readonly K[]
): ModuleWithAccessSubs<K> {
  const r = (raw && typeof raw === "object" ? raw : {}) as { enabled?: unknown; subs?: unknown };
  const subsRaw = (r.subs && typeof r.subs === "object" ? r.subs : {}) as Record<string, unknown>;
  const subs = Object.fromEntries(subKeys.map((k) => [k, normAccessSub(subsRaw[k])])) as Record<K, SubPermission>;
  return { enabled: typeof r.enabled === "boolean" ? r.enabled : true, subs };
}

function normDashboard(raw: unknown): ModuleWithToggleSubs<DashboardKpiKey> {
  const r = (raw && typeof raw === "object" ? raw : {}) as { enabled?: unknown; subs?: unknown };
  const subsRaw = (r.subs && typeof r.subs === "object" ? r.subs : {}) as Record<string, unknown>;
  const keys: DashboardKpiKey[] = ["contacts_kpis", "deals_kpis", "revenue_kpis"];
  const subs = Object.fromEntries(keys.map((k) => [k, normToggleSub(subsRaw[k])])) as Record<
    DashboardKpiKey,
    ToggleSubPermission
  >;
  return { enabled: typeof r.enabled === "boolean" ? r.enabled : true, subs };
}

function normSimpleModule(raw: unknown): SimpleModule {
  const r = (raw && typeof raw === "object" ? raw : {}) as { enabled?: unknown };
  return { enabled: typeof r.enabled === "boolean" ? r.enabled : true };
}

const CONTACTS_SUBS: readonly ContactsSubKey[] = ["people", "companies", "segments"];
const DEALS_SUBS: readonly DealsSubKey[] = ["pipelines", "forecasts"];
const PROJECTS_SUBS: readonly ProjectsSubKey[] = ["all_projects", "project_templates", "milestones"];
const TASKS_SUBS: readonly TasksSubKey[] = ["my_tasks", "team_board", "workload"];
const INVOICES_SUBS: readonly InvoicesSubKey[] = ["all_invoices", "recurring_billing", "product_library"];
const TEAM_SUBS: readonly TeamSubKey[] = ["active_members", "pending_invites", "team_directory", "departments"];

// Converts any stored/legacy/partial permissions value into a fully-populated
// v2 object. Missing fields, an old (pre-v2) shape, or unrecognized input all
// fall back to enabled=true/access="full" per module -- i.e. fully open --
// so a member with no (or unrecognized) permissions data keeps today's
// "visible by default" behavior instead of silently losing access. Owner
// bypass in hasModuleAccess()/requireModuleAccess() is untouched by this.
export function normalizePermissions(raw: unknown): WorkspacePermissions {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    version: 2,
    dashboard: normDashboard(r.dashboard),
    contacts: normModuleWithAccessSubs(r.contacts, CONTACTS_SUBS),
    deals: normModuleWithAccessSubs(r.deals, DEALS_SUBS),
    projects: normModuleWithAccessSubs(r.projects, PROJECTS_SUBS),
    tasks: normModuleWithAccessSubs(r.tasks, TASKS_SUBS),
    invoices: normModuleWithAccessSubs(r.invoices, INVOICES_SUBS),
    team: normModuleWithAccessSubs(r.team, TEAM_SUBS),
    ai_assistant: normSimpleModule(r.ai_assistant),
    settings: normSimpleModule(r.settings),
  };
}

type WriteAccessError = { error: string };

// Server-side write gate (Phase 1b). Call at the top of every create/
// update/delete action, right after requireWorkspace(). Owner and admin
// always bypass (admin bypass is a deliberate Phase 1b choice -- the boss's
// doc treats admin as full-access for now; revisit if that changes). A
// disabled module, a disabled submodule, or a submodule set to "view" all
// block the write with the same generic message so we don't leak which of
// the three applies.
export function requireFullAccess<K extends AccessModuleKey>(
  workspace: CurrentWorkspace,
  moduleKey: K,
  submoduleKey: Extract<keyof WorkspacePermissions[K]["subs"], string>
): WriteAccessError | null {
  if (workspace.role === "owner" || workspace.role === "admin") return null;

  const permissions = normalizePermissions(workspace.permissions);
  const mod = permissions[moduleKey];
  if (!mod.enabled) return { error: "You don't have access to this." };

  const sub = (mod.subs as Record<string, SubPermission>)[submoduleKey];
  if (!sub.enabled) return { error: "You don't have access to this." };
  if (sub.access === "view") return { error: "You have view-only access to this." };
  return null;
}

// Client/server-shared read of the same rule as requireFullAccess(), for
// hiding Add/Edit/Delete controls in the UI. This is UX only -- the real
// gate is requireFullAccess() in the server action itself.
export function canEditModule<K extends AccessModuleKey>(
  workspace: { role: string; permissions: WorkspacePermissions | null } | null | undefined,
  moduleKey: K,
  submoduleKey: Extract<keyof WorkspacePermissions[K]["subs"], string>
): boolean {
  if (!workspace) return true;
  if (workspace.role === "owner" || workspace.role === "admin") return true;

  const permissions = normalizePermissions(workspace.permissions);
  const mod = permissions[moduleKey];
  if (!mod.enabled) return false;

  const sub = (mod.subs as Record<string, SubPermission>)[submoduleKey];
  if (!sub.enabled) return false;
  return sub.access !== "view";
}

const FULL: SubPermission = { enabled: true, access: "full" };
const OFF: SubPermission = { enabled: false, access: "full" };

// Role-based default permission baselines (Phase 3), applied once to a
// brand new membership -- see acceptInvitation() in
// lib/actions/team-invites.ts. Owners never get a stored baseline; they
// bypass every check via role alone.
export const MEMBER_DEFAULT_PERMISSIONS: WorkspacePermissions = {
  version: 2,
  dashboard: {
    enabled: true,
    subs: { contacts_kpis: { enabled: true }, deals_kpis: { enabled: true }, revenue_kpis: { enabled: false } },
  },
  contacts: { enabled: true, subs: { people: FULL, companies: FULL, segments: FULL } },
  deals: { enabled: true, subs: { pipelines: FULL, forecasts: FULL } },
  projects: { enabled: true, subs: { all_projects: FULL, project_templates: FULL, milestones: FULL } },
  tasks: { enabled: true, subs: { my_tasks: FULL, team_board: OFF, workload: OFF } },
  invoices: { enabled: false, subs: { all_invoices: OFF, recurring_billing: OFF, product_library: OFF } },
  team: { enabled: false, subs: { active_members: OFF, pending_invites: OFF, team_directory: OFF, departments: OFF } },
  ai_assistant: { enabled: true },
  settings: { enabled: true },
};

export const ADMIN_DEFAULT_PERMISSIONS: WorkspacePermissions = {
  version: 2,
  dashboard: {
    enabled: true,
    subs: { contacts_kpis: { enabled: true }, deals_kpis: { enabled: true }, revenue_kpis: { enabled: true } },
  },
  contacts: { enabled: true, subs: { people: FULL, companies: FULL, segments: FULL } },
  deals: { enabled: true, subs: { pipelines: FULL, forecasts: FULL } },
  projects: { enabled: true, subs: { all_projects: FULL, project_templates: FULL, milestones: FULL } },
  tasks: { enabled: true, subs: { my_tasks: FULL, team_board: FULL, workload: FULL } },
  invoices: { enabled: true, subs: { all_invoices: FULL, recurring_billing: FULL, product_library: FULL } },
  team: { enabled: true, subs: { active_members: FULL, pending_invites: FULL, team_directory: FULL, departments: FULL } },
  ai_assistant: { enabled: true },
  settings: { enabled: true },
};

// Returns the default permission baseline for a newly-added member, or
// null for "owner" (and any unrecognized role) -- owners bypass every
// check via role alone and never need a stored baseline.
export function getDefaultPermissions(role: string): WorkspacePermissions | null {
  if (role === "admin") return ADMIN_DEFAULT_PERMISSIONS;
  if (role === "member") return MEMBER_DEFAULT_PERMISSIONS;
  return null;
}
