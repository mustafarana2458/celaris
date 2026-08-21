import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/service";
import { createAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";

// Admin Auth Rebuild Phase 2: the new, independent admin login. Not
// wired into any existing route/guard -- this is purely additive. Fully
// unrelated to Supabase auth: no auth.users, no createClient() session
// client, only admin_users/admin_sessions via the service-role client.

const GENERIC_ERROR = "Invalid email or password.";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // keep in sync with lib/adminAuth.ts's SESSION_TTL_MS

// A real bcrypt hash of a fixed, unused string -- NOT a real admin's
// password (the plaintext behind it is never used anywhere). Compared
// against whenever the looked-up email doesn't resolve to an active
// admin, so bcrypt.compare() always runs and takes roughly the same time
// whether or not the email exists -- keeps "no such admin" and "wrong
// password" from being trivially distinguishable by response timing.
const DUMMY_HASH = "$2b$12$HDJw7J7WnNsWrwfWZCmp7uPUzRL84m62xMJWrbUgxSiKyuBB/LVOa";

type LoginBody = { email?: unknown; password?: unknown };
type AdminUserRow = { id: string; email: string; password_hash: string; name: string; is_active: boolean };

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: GENERIC_ERROR }, { status: 400 });
  }

  const supabase = createServiceClient();
  // admin_users.email is written lowercase at insert time (see the seed
  // template in sql/admin_auth_schema.sql) -- the unique index on
  // lower(email) is the DB-level backstop against that convention ever
  // being violated, not something this query relies on for matching.
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, email, password_hash, name, is_active")
    .eq("email", email)
    .maybeSingle<AdminUserRow>();

  // Always compare against SOME hash -- the real one for an
  // active, existing admin, the dummy one otherwise -- so this line
  // always costs the same regardless of which case we're in.
  const hashToCheck = adminUser?.is_active ? adminUser.password_hash : DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCheck);

  if (!adminUser || !adminUser.is_active || !passwordMatches) {
    return NextResponse.json({ ok: false, error: GENERIC_ERROR }, { status: 401 });
  }

  let session: { token: string; expiresAt: Date };
  try {
    session = await createAdminSession(adminUser.id, request.headers.get("user-agent"));
  } catch (err) {
    console.error("[admin auth login] session creation failed:", err);
    return NextResponse.json({ ok: false, error: "Could not sign in. Try again." }, { status: 500 });
  }

  // Best-effort -- a failed last_login_at write must never block a
  // successful login; the session is already valid at this point.
  const { error: touchError } = await supabase
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", adminUser.id);
  if (touchError) {
    console.error("[admin auth login] last_login_at update failed:", touchError.message);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    // No `domain` -- host-only, scoped to exactly whichever host this
    // login happened on (admin.celaris.cloud in production).
  });
  return response;
}
