import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";

// Admin Users module: generates a password-recovery link via the
// Supabase Admin API (auth.admin.generateLink) rather than
// auth.resetPasswordForEmail() or setting a password directly.
//
// Why generateLink and not resetPasswordForEmail: generateLink() returns
// the action_link/token WITHOUT sending any email itself -- delivery is
// left entirely to the caller. resetPasswordForEmail() instead has GoTrue
// send the email itself over this instance's configured SMTP relay,
// which per this project's history (see memory: signup previously failed
// outright with "Error sending confirmation email" because no SMTP was
// configured, worked around at the time via ENABLE_EMAIL_AUTOCONFIRM
// rather than an actual SMTP fix) is NOT confirmed working here. Using
// generateLink and handing the raw link back to the admin (see
// components/admin/users/PasswordResetModal.tsx) means this feature
// works regardless of SMTP state -- the admin copies the link and
// delivers it to the user through whatever channel is actually reliable
// right now, instead of a button that silently no-ops if SMTP is still
// broken.
//
// Never sets a password directly -- the user must still complete the
// reset themselves via the link.

type ResetLinkBody = { userId?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: ResetLinkBody;
  try {
    body = (await request.json()) as ResetLinkBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });

  const supabase = createServiceClient();

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userData.user?.email) {
    console.error("[admin users reset-password-link] user lookup failed:", userError?.message);
    return NextResponse.json({ ok: false, error: "Could not find this user's email." }, { status: 404 });
  }
  const email = userData.user.email;

  const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
  if (error) {
    console.error("[admin users reset-password-link] generateLink failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not generate a reset link." }, { status: 500 });
  }

  // Deliberately NOT included in audit details -- the link/token is a
  // credential-equivalent secret (whoever holds it can reset the
  // password), so persisting it into a queryable log (even one gated to
  // platform admins) is an unnecessary retention risk. The audit trail
  // only needs to prove a reset was dispatched and for whom, not the
  // secret itself.
  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "user.password_reset_dispatch",
    targetType: "user",
    targetId: userId,
    details: { email },
  });

  return NextResponse.json({ ok: true, actionLink: data.properties.action_link });
}
