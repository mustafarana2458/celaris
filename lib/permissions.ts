import { redirect } from "next/navigation";
import type { CurrentWorkspace } from "./workspace";
import type { WorkspacePermissions } from "./types";

// Single source of truth for module/submodule visibility, used by both the
// sidebar (cosmetic) and route guards (actual enforcement). Owners are
// always exempt. Missing/empty permissions (or an explicit key that isn't
// `false`) default to visible -- only an explicit `false` hides something,
// so members with no permissions set are unaffected.
export function hasModuleAccess(
  role: string | null | undefined,
  permissions: WorkspacePermissions | null | undefined,
  moduleKey: string,
  submoduleKey?: string
): boolean {
  if (role === "owner") return true;
  if (!permissions) return true;
  if (permissions.modules?.[moduleKey] === false) return false;
  if (submoduleKey && permissions.submodules?.[moduleKey]?.[submoduleKey] === false) return false;
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
