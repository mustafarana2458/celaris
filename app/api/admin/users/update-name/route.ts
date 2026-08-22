import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";

// Admin Users module: edits public.users.full_name -- this app's own
// display-name field, NOT auth identity. Deliberately the only profile
// field this module edits. Email is not editable here: changing
// auth.users.email via the Admin API can bypass the normal
// confirmation flow entirely (updateUserById accepts email_confirm to
// force it through unverified), which is a much higher-risk action
// (effectively lets an admin redirect a user's account identity/login)
// that needs its own deliberate design, not a quick add-on to this
// route. "Role" edits are out of scope too -- see the module's report:
// a user can belong to multiple workspaces with different roles each,
// so "edit this user's role" is ambiguous without picking a workspace
// context, which is really the Workspaces/Team settings' job, not a
// user-centric one.

type UpdateNameBody = { userId?: unknown; fullName?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: UpdateNameBody;
  try {
    body = (await request.json()) as UpdateNameBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (!fullName) return NextResponse.json({ ok: false, error: "Enter a name." }, { status: 400 });
  if (fullName.length > 200) return NextResponse.json({ ok: false, error: "Name is too long." }, { status: 400 });

  const supabase = createServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("id", userId)
    .maybeSingle<{ id: string; full_name: string | null }>();

  if (fetchError) {
    console.error("[admin users update-name] fetch failed:", fetchError.message);
    return NextResponse.json({ ok: false, error: "Could not load this user." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const oldName = existing.full_name;
  if (oldName === fullName) {
    return NextResponse.json({ ok: true, noChange: true, fullName });
  }

  const { error: updateError } = await supabase.from("users").update({ full_name: fullName }).eq("id", userId);
  if (updateError) {
    console.error("[admin users update-name] update failed:", updateError.message);
    return NextResponse.json({ ok: false, error: "Could not update the name." }, { status: 500 });
  }

  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "user.profile_update",
    targetType: "user",
    targetId: userId,
    details: { field: "full_name", old_value: oldName, new_value: fullName },
  });

  return NextResponse.json({ ok: true, noChange: false, fullName });
}
