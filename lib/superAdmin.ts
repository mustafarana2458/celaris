import type { SupabaseClient } from "@supabase/supabase-js";

// Super Admin Portal Phase 1: checks the CURRENT session's user against
// public.platform_admins via the is_platform_admin() Postgres function
// (see the Phase 1 SQL -- not committed to this repo, run manually, same
// convention as the rest of this project's SQL). is_platform_admin() is
// deliberately zero-arg -- it checks auth.uid() server-side, not a
// client-supplied id -- so this can never be used to probe whether some
// OTHER user is a platform admin.
//
// Distinct from workspace_members.role (owner/admin/member, see
// lib/permissions.ts) -- a workspace owner is NOT a platform admin unless
// they also have a row in platform_admins. See app/admin/layout.tsx for
// the guard that uses this.
export async function isPlatformAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    // Fail closed: an RPC error (missing function, network issue,
    // permission problem) must never be treated as "let them through".
    console.error("[superAdmin] is_platform_admin check failed:", error.message);
    return false;
  }
  return data === true;
}
