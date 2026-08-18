import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client -- bypasses Row Level Security entirely. Only use
// this for server-only code that has no user session to authenticate with
// (the Lemon Squeezy webhook handler is the first caller), and only for
// tables deliberately locked down to service-role-only writes (see
// sql/subscriptions_schema.sql). Never import this into a client
// component, and never reach for it just because an RLS check is
// inconvenient elsewhere -- if a user-facing action needs it, that is a
// sign the RLS policy is wrong, not that this client is the fix.
//
// Not wired into anything yet (Phase 1 is schema-only) -- this exists so
// the webhook handler in a later phase has it ready.
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service-role client is not configured (missing URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
