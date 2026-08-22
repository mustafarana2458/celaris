import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";

// Admin Portal AI Engine module: Groq latency threshold. Storage +
// audit-logging ONLY -- deliberately NOT read by lib/groq.ts's live
// request path (it still uses a fixed 30s timeout / 3 retries on 429).
// A preemptive latency-based fallback would change existing request
// timing for every AI call, which is exactly the kind of change the boss
// asked to keep out of this pass -- see the AI Engine build report for
// what wiring this in would actually require. This value is saved so the
// admin page has somewhere real to persist it, not to imply it's already
// enforced.

const MIN_MS = 500;
const MAX_MS = 30_000;

type ThresholdsBody = { groqLatencyThresholdMs?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: ThresholdsBody;
  try {
    body = (await request.json()) as ThresholdsBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const ms = typeof body.groqLatencyThresholdMs === "number" ? Math.round(body.groqLatencyThresholdMs) : NaN;
  if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) {
    return NextResponse.json({ ok: false, error: `Enter a threshold between ${MIN_MS} and ${MAX_MS} ms.` }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_engine_groq_latency_threshold_ms")
    .maybeSingle<{ value: string }>();
  const oldMs = current?.value ? Number(current.value) : null;

  if (oldMs === ms) {
    return NextResponse.json({ ok: true, noChange: true, groqLatencyThresholdMs: ms });
  }

  // Deliberately NOT setting updated_by -- see the identical comment in
  // app/api/admin/ai-engine/strategy/route.ts.
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "ai_engine_groq_latency_threshold_ms",
      value: String(ms),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("[admin ai-engine thresholds] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not update the threshold." }, { status: 500 });
  }

  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "ai_engine.threshold_change",
    targetType: "platform",
    targetId: null,
    details: { old: oldMs, new: ms, enforced: false },
  });

  return NextResponse.json({ ok: true, noChange: false, groqLatencyThresholdMs: ms });
}
