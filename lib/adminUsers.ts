import type { SupabaseClient } from "@supabase/supabase-js";

// Admin Portal: auth.users isn't exposed through PostgREST's public
// schema, so email lookups go through the Supabase Admin API
// (supabase.auth.admin.*) instead of a plain .from("users") query --
// that hits public.users, which mirrors auth.users by id but does NOT
// store email (confirmed: nothing in this codebase selects an email
// column off public.users; ProfileTab reads user.email from the session
// instead). Both functions below require a service-role client -- the
// Admin API rejects anon/authenticated keys outright.

const BULK_LIST_PAGE_SIZE = 1000;

// One-shot bulk fetch for list pages that need many owners' emails at
// once (e.g. the Workspaces list). Capped at BULK_LIST_PAGE_SIZE users in
// a single page -- fine while the platform's total user count is well
// under that, but this does NOT paginate past it. Revisit with real
// pagination (or a public.users.email mirror column kept in sync at
// signup) if the user base grows past ~1000.
export async function getAuthEmailMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: BULK_LIST_PAGE_SIZE });
  if (error) {
    console.error("[adminUsers] listUsers failed:", error.message);
    return map;
  }
  for (const user of data.users) {
    if (user.email) map.set(user.id, user.email);
  }
  return map;
}

// Single-user lookup for detail pages that only need one email (e.g. one
// workspace's owner). Cheaper than a bulk list when there's only one id.
export async function getAuthEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error("[adminUsers] getUserById failed:", error.message);
    return null;
  }
  return data.user?.email ?? null;
}
