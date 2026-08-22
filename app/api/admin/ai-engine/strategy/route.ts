import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/adminAuth";
import { logAuditEvent } from "@/lib/auditLog";
import { fetchModeFromDb, invalidateProviderModeCache, type AiProviderMode } from "@/lib/groq";

// Admin Portal AI Engine module: platform-wide routing strategy. Writes
// the same app_settings.ai_provider_mode row the Dev Panel already writes
// (lib/actions/devPanel.ts setAiProviderMode) -- same key, same live-path
// mechanism (lib/groq.ts already reads this at request time with a 5s
// cache) -- this route just adds platform-admin gating + audit logging on
// top of an already-live control, it does not introduce any new live-path
// behavior.

const VALID_MODES: AiProviderMode[] = ["auto", "auto2", "groq", "mistral"];

type StrategyBody = { strategy?: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  let body: StrategyBody;
  try {
    body = (await request.json()) as StrategyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const strategy = typeof body.strategy === "string" ? (body.strategy as AiProviderMode) : null;
  if (!strategy || !VALID_MODES.includes(strategy)) {
    return NextResponse.json({ ok: false, error: "Choose a valid strategy." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const oldStrategy = await fetchModeFromDb(supabase);

  if (oldStrategy === strategy) {
    return NextResponse.json({ ok: true, noChange: true, strategy: oldStrategy });
  }

  // Deliberately NOT setting updated_by here: this column is also
  // written by the Dev Panel with a real Supabase auth.users id
  // (lib/actions/devPanel.ts setAiProviderMode), so it likely carries an
  // FK to auth.users -- writing an admin_users id there could fail the
  // whole upsert outright (unlike audit_logs.actor_user_id, whose FK the
  // boss is dropping separately, this column's constraint is unverified
  // and out of scope here). Who changed it is already fully captured by
  // the logAuditEvent call below via actor_email.
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "ai_provider_mode", value: strategy, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    console.error("[admin ai-engine strategy] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not update the routing strategy." }, { status: 500 });
  }

  invalidateProviderModeCache();

  await logAuditEvent({
    actorUserId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: "ai_engine.strategy_change",
    targetType: "platform",
    targetId: null,
    details: { old: oldStrategy, new: strategy },
  });

  return NextResponse.json({ ok: true, noChange: false, strategy });
}
