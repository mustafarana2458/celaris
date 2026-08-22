import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Admin Auth Rebuild Phase 2: session lifecycle for the NEW, independent
// admin_users/admin_sessions system -- completely unrelated to Supabase
// auth. Nothing in here is wired into any existing admin route yet
// (that's Phase 3); this module is self-contained and safe to add
// without affecting anything currently working.

export const ADMIN_SESSION_COOKIE = "admin_session";

// A high-privilege session for a tiny admin user base -- short-lived
// enough to limit a leaked-cookie blast radius, long enough not to force
// a re-login mid-workday. Revocation (logout, or a future "kill all
// sessions") doesn't depend on this window at all -- see
// revokeAdminSession below -- this is just the outer bound if nothing
// else ends the session first.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export type AdminUser = { id: string; email: string; name: string };

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// 32 random bytes, base64url-encoded -- URL/cookie-safe with no padding
// characters to escape. This raw value is what lives in the cookie; only
// its sha256 hash (via hashToken above) is ever written to the DB, same
// principle as never storing a plaintext password.
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// Called by the login route right after a password check succeeds.
// Returns the RAW token (for the caller to set as the cookie value) --
// this is the only place the raw token exists outside the browser's
// cookie jar; it is never logged, never returned again, never
// reconstructable from what's stored.
export async function createAdminSession(
  adminUserId: string,
  userAgent?: string | null
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const supabase = createServiceClient();
  const { error } = await supabase.from("admin_sessions").insert({
    admin_user_id: adminUserId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
    user_agent: userAgent ?? null,
  });

  if (error) {
    throw new Error(`Failed to create admin session: ${error.message}`);
  }

  return { token, expiresAt };
}

// Marks a session revoked (sets revoked_at) rather than deleting the row,
// so a revoked session leaves a record that it existed. Idempotent --
// revoking an already-revoked or nonexistent token is a silent no-op,
// never an error, since logout must always succeed from the caller's
// point of view regardless of the session's prior state.
export async function revokeAdminSession(token: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null);
}

type AdminSessionRow = { admin_user_id: string; expires_at: string; revoked_at: string | null };
type AdminUserRow = { id: string; email: string; name: string; is_active: boolean };

// Resolves a raw token (as read from the cookie) to the admin it belongs
// to, or null if the token is missing, unknown, expired, revoked, or
// belongs to a now-deactivated admin. Deliberately fail-closed: any
// unexpected error (DB hiccup, malformed data) falls through to the
// catch block below and returns null exactly like "no session" -- this
// must never throw up into a caller and must never treat an error as
// "let them in".
export async function getAdminSessionFromToken(token: string | undefined | null): Promise<AdminUser | null> {
  if (!token) return null;

  try {
    const supabase = createServiceClient();

    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("admin_user_id, expires_at, revoked_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle<AdminSessionRow>();

    if (sessionError || !session) return null;
    if (session.revoked_at) return null;
    if (new Date(session.expires_at).getTime() <= Date.now()) return null;

    const { data: adminUser, error: userError } = await supabase
      .from("admin_users")
      .select("id, email, name, is_active")
      .eq("id", session.admin_user_id)
      .maybeSingle<AdminUserRow>();

    if (userError || !adminUser || !adminUser.is_active) return null;

    return { id: adminUser.id, email: adminUser.email, name: adminUser.name };
  } catch (err) {
    console.error("[adminAuth] getAdminSessionFromToken failed:", err);
    return null;
  }
}

// Convenience wrapper for Server Components / Route Handlers -- reads the
// cookie via next/headers and resolves it the same way.
export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return getAdminSessionFromToken(token);
}

// Admin Auth Rebuild Phase 3: the unified guard, mirroring the shape of
// the old (deleted -- see Phase 4 cleanup) Supabase-based
// requireSuperAdmin()/requireSuperAdminPage() exactly, so every call
// site swap was mechanical (same import shape, same .ok check, same
// .response escape hatch) rather than a rewrite.
// Only one failure mode here (unlike the old "signed in but not a
// platform admin" vs "not signed in" split) -- admin_users has no
// separate tier, so "no valid admin session" is the only case.

export type AdminSessionApiResult = { ok: true; admin: AdminUser } | { ok: false; response: NextResponse };

// For app/api/admin/**/route.ts. Every route under app/api/admin/** MUST
// call this itself -- there is no layout-equivalent for the API route
// tree (see the Phase A report), so this is the one place that
// enforcement actually lives for API routes.
export async function requireAdminSession(): Promise<AdminSessionApiResult> {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 }),
    };
  }
  return { ok: true, admin };
}

// For app/admin/(protected)/**/page.tsx (via the (protected)/layout.tsx
// that wraps all of them). Redirects itself to /admin/login -- NOT the
// regular app's /login, since this admin is never expected to have a
// Supabase session at all.
export async function requireAdminSessionPage(): Promise<AdminUser> {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}
