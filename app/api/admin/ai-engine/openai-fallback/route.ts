import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { logAuditEvent } from "@/lib/auditLog";
import { fetchOpenAiFallbackFromDb, invalidateOpenAiFallbackCache } from "@/lib/groq";

// Admin Portal AI Engine module: OpenAI fallback safety net toggle.
// FLAGGED FOR REVIEW: this is the one control on this page whose live-path
// support (lib/groq.ts tryOpenAI/tryFinalFallback) is net-new code, not a
// pre-existing mechanism -- see the AI Engine build report. Off by default;
// enabling it here (and this route writing "true") is what actually turns
// it on for live requests, via the same read-at-request-time + cache
// pattern as the strategy selector.

type OpenAiFallbackBody = { enabled?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: OpenAiFallbackBody;
  try {
    body = (await request.json()) as OpenAiFallbackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "Missing enabled flag." }, { status: 400 });
  }
  const enabled = body.enabled;

  const supabase = createServiceClient();
  const oldEnabled = await fetchOpenAiFallbackFromDb(supabase);

  if (oldEnabled === enabled) {
    return NextResponse.json({ ok: true, noChange: true, enabled: oldEnabled });
  }

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "ai_engine_openai_fallback",
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("[admin ai-engine openai-fallback] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not update the OpenAI fallback setting." }, { status: 500 });
  }

  invalidateOpenAiFallbackCache();

  await logAuditEvent({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email ?? null,
    action: "ai_engine.openai_fallback_change",
    targetType: "platform",
    targetId: null,
    details: { old: oldEnabled, new: enabled },
  });

  return NextResponse.json({ ok: true, noChange: false, enabled });
}
