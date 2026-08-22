import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";
import { isCurrentlyBanned } from "@/lib/adminUsers";

// Admin Users module: suspend/unsuspend via Supabase's own GoTrue ban
// mechanism (auth.admin.updateUserById(uid, { ban_duration })) -- NOT an
// app-level "suspended" flag + a middleware/login check. This is a
// deliberate choice, not a shortcut:
//
// - GoTrue enforces bans itself, at the auth server, independent of this
//   app: a banned user's sign-in attempts are rejected outright, and an
//   already-issued access token stops refreshing (GoTrue rejects the
//   refresh-token request) once it expires -- normally within about an
//   hour. This route calls the Admin API and nothing else; it does NOT
//   touch middleware.ts, lib/supabase/middleware.ts, or any login route
//   in this app. There is no separate "enforcement piece" of ours to
//   build or hold back -- Supabase's auth server already does the
//   enforcing, the same way it already rejects a wrong password.
// - This is standard, long-stable GoTrue behavior, not something new or
//   experimental added for this feature. It has not been end-to-end
//   verified against a real account on this specific self-hosted
//   instance as part of this change (that would mean actually banning a
//   real user to test it) -- recommend a controlled test with a
//   disposable/test account before fully relying on it in production.
// - A separate app-level `suspended` column was deliberately NOT added:
//   it would create a second source of truth that could drift from
//   GoTrue's actual ban state (e.g. someone lifts the ban via the
//   Supabase dashboard directly, bypassing this app's flag), which is
//   worse than relying on the one authoritative source (banned_until on
//   auth.users, read back fresh via getUserById on every page load).
//
// ban_duration accepts 'none' to lift a ban, or a duration string to
// apply one -- SUSPEND_DURATION below is long enough to function as
// "until an admin unsuspends", not a literal time-boxed suspension.

const SUSPEND_DURATION = "876000h"; // ~100 years -- effectively indefinite, until explicitly lifted.

type SuspendBody = { userId?: unknown; suspended?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: SuspendBody;
  try {
    body = (await request.json()) as SuspendBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  if (typeof body.suspended !== "boolean") {
    return NextResponse.json({ ok: false, error: "Missing suspended." }, { status: 400 });
  }
  const suspend = body.suspended;

  const supabase = createServiceClient();

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    console.error("[admin users suspend] user lookup failed:", userError?.message);
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const wasBanned = isCurrentlyBanned(userData.user.banned_until ?? null);
  if (wasBanned === suspend) {
    return NextResponse.json({ ok: true, noChange: true, suspended: wasBanned });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? SUSPEND_DURATION : "none",
  });

  if (updateError) {
    console.error("[admin users suspend] updateUserById failed:", updateError.message);
    return NextResponse.json({ ok: false, error: "Could not update this account's status." }, { status: 500 });
  }

  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "user.suspend_toggle",
    targetType: "user",
    targetId: userId,
    details: { suspended: suspend, email: userData.user.email ?? null },
  });

  return NextResponse.json({ ok: true, noChange: false, suspended: suspend });
}
