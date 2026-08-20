import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export type SuperAdminApiResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse };

// Shared re-check for admin API routes (app/api/admin/**/route.ts). The
// app/admin/layout.tsx guard only covers page RENDERS -- an API route is a
// separate invocation Next.js can hit directly (fetch, curl, a stale tab)
// without ever going through that layout, so every admin route/action
// must call this itself rather than assume the layout already covered it.
// Same two-step check as the layout: signed in, then platform admin,
// fail-closed on any error in either step. Returns the session client
// (for reading who's asking) -- callers still need their own
// createServiceClient() for the actual writes, since promo_codes/etc are
// service-role-write-only by RLS design and this helper deliberately
// doesn't blur that line.
export async function requireSuperAdmin(): Promise<SuperAdminApiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 }) };
  }

  const allowed = await isPlatformAdmin(supabase);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Forbidden -- platform admin access required." }, { status: 403 }),
    };
  }

  return { ok: true, user, supabase };
}
