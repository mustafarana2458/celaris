import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/superAdmin";

// Admin Promo Code wizard: pause/activate an existing code. Platform-admin
// gated, same as app/api/admin/promo/create/route.ts. The client sends the
// TARGET state (what the toggle in the UI now shows) rather than this
// route flipping the current value itself -- avoids a read-then-write
// round trip, and a double-click just re-sends the same target twice
// (idempotent), not a toggle race.

type ToggleBody = { id?: unknown; is_active?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: ToggleBody;
  try {
    body = (await request.json()) as ToggleBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "Missing code id." }, { status: 400 });
  if (typeof body.is_active !== "boolean") {
    return NextResponse.json({ ok: false, error: "Missing is_active." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("id, is_active")
    .maybeSingle();

  if (error) {
    console.error("[admin promo toggle] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not update the code." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Code not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: data.id, is_active: data.is_active });
}
