import { redirect } from "next/navigation";
import type { CurrentWorkspace } from "./workspace";
import type {
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
// always exempt. Missing/empty permissions default to visible -- only an
// explicit `enabled: false` hides something, so members with no permissions
// set are unaffected.
//
// NOTE (Phase 1a): this only reads the v2 shape's `enabled` flags to stay
// type-compatible with the new schema. It does not check `access`
// (view/full) and there is no write-side enforcement yet -- that's Phase 1b.
export function hasModuleAccess(
  role: string | null | undefined,
  permissions: WorkspacePermissions | null | undefined,
  moduleKey: string,
  submoduleKey?: string
): boolean {
  if (role === "owner") return true;
  if (!permissions) return true;

  const mod = (
    permissions as unknown as Record<string, { enabled: boolean; subs?: Record<string, { enabled: boolean }> }>
  )[moduleKey];
  if (!mod) return true;
  if (mod.enabled === false) return false;
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
