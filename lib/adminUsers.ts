import type { SupabaseClient } from "@supabase/supabase-js";

// Admin Portal: auth.users isn't exposed through PostgREST's public
// schema, so email/account lookups go through the Supabase Admin API
// (supabase.auth.admin.*) instead of a plain .from("users") query --
// that hits public.users, which mirrors auth.users by id but does NOT
// store email (confirmed: nothing in this codebase selects an email
// column off public.users; ProfileTab reads user.email from the session
// instead). Every function below requires a service-role client -- the
// Admin API rejects anon/authenticated keys outright.

const BULK_LIST_PAGE_SIZE = 1000;

export type AdminAuthUser = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
};

export function isCurrentlyBanned(bannedUntil: string | null): boolean {
  if (!bannedUntil) return false;
  // GoTrue represents "not banned" as either a null banned_until or, after
  // a ban has been explicitly lifted, a far-past/epoch-ish timestamp --
  // treat "banned_until in the future" as the only true "is banned" signal
  // rather than just "banned_until is non-null".
  return new Date(bannedUntil).getTime() > Date.now();
}

// One-shot bulk fetch for list pages that need every account at once
// (Users list, and the Workspaces list's owner-email lookup). Capped at
// BULK_LIST_PAGE_SIZE users in a single page -- fine while the platform's
// total user count is well under that, but this does NOT paginate past
// it. Revisit with real pagination (or a public.users mirror kept in sync
// at signup) if the user base grows past ~1000.
export async function listAllAuthUsers(supabase: SupabaseClient): Promise<AdminAuthUser[]> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: BULK_LIST_PAGE_SIZE });
  if (error) {
    console.error("[adminUsers] listUsers failed:", error.message);
    return [];
  }
  return data.users.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    bannedUntil: user.banned_until ?? null,
  }));
}

export async function getAuthEmailMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const user of await listAllAuthUsers(supabase)) {
    if (user.email) map.set(user.id, user.email);
  }
  return map;
}

// Single-user lookup for detail pages that only need one account (e.g.
// one workspace's owner, or the Users detail page). Cheaper than a bulk
// list when there's only one id.
export async function getAuthUser(supabase: SupabaseClient, userId: string): Promise<AdminAuthUser | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error("[adminUsers] getUserById failed:", error.message);
    return null;
  }
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    createdAt: data.user.created_at,
    lastSignInAt: data.user.last_sign_in_at ?? null,
    bannedUntil: data.user.banned_until ?? null,
  };
}

export async function getAuthEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const user = await getAuthUser(supabase, userId);
  return user?.email ?? null;
}
