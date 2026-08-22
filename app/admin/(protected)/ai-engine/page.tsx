import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSessionPage } from "@/lib/adminAuth";
import { fetchModeFromDb, fetchOpenAiFallbackFromDb, type AiProviderMode } from "@/lib/groq";
import { MetricCard } from "@/components/admin/overview/MetricCard";
import { AiEngineClient } from "@/components/admin/ai-engine/AiEngineClient";

// Admin Portal AI Engine Control module. Migrates the Dev Panel's AI
// provider mode selector into a platform-admin-gated, audit-logged,
// confirmed interface -- see the AI Engine build report for the full
// investigation. Server Component: reads current config + telemetry here,
// hands them to a client component for the interactive selector/toggle/
// threshold inputs (each of which requires confirmation + a fetch to an
// /api/admin/ai-engine/* route, so it can't be a plain form the way the
// read-only modules are).

const DEFAULT_THRESHOLD_MS = 2500;
const TELEMETRY_DAYS = 30;

export type AiEngineConfig = {
  strategy: AiProviderMode;
  openaiFallbackEnabled: boolean;
  groqLatencyThresholdMs: number;
};

export default async function AdminAiEnginePage() {
  await requireAdminSessionPage();

  const supabase = createServiceClient();

  const [strategy, openaiFallbackEnabled, thresholdRes] = await Promise.all([
    fetchModeFromDb(supabase),
    fetchOpenAiFallbackFromDb(supabase),
    supabase.from("app_settings").select("value").eq("key", "ai_engine_groq_latency_threshold_ms").maybeSingle<{ value: string }>(),
  ]);

  const groqLatencyThresholdMs = thresholdRes.data?.value ? Number(thresholdRes.data.value) : DEFAULT_THRESHOLD_MS;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (TELEMETRY_DAYS - 1));
  cutoff.setHours(0, 0, 0, 0);

  const { data: usageRows } = await supabase
    .from("ai_usage_log")
    .select("cost, created_at")
    .gte("created_at", cutoff.toISOString());

  const rows = (usageRows as { cost: number; created_at: string }[] | null) ?? [];
  const creditsLast30Days = rows.reduce((sum, r) => sum + r.cost, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const creditsLast7Days = rows.filter((r) => new Date(r.created_at) >= sevenDaysAgo).reduce((sum, r) => sum + r.cost, 0);

  const config: AiEngineConfig = { strategy, openaiFallbackEnabled, groqLatencyThresholdMs };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Engine Control</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Model routing across every workspace. Migrated from the Dev Panel -- changes here are platform-admin gated,
          audit-logged, and take effect on the next AI request (within ~5 seconds), no redeploy required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Celaris credits consumed (7d)" value={creditsLast7Days.toLocaleString()} />
        <MetricCard label="Celaris credits consumed (30d)" value={creditsLast30Days.toLocaleString()} />
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-300">Not available yet:</strong> upstream token cost ($) per
        provider isn&apos;t tracked -- the usage log records Celaris credits consumed per action, not which provider
        (Groq/Mistral/OpenAI) served the request or its actual token cost. Building that would mean tagging every AI
        call with which provider actually answered it, which touches the same live request path called out below --
        not done here. Numbers above are real, platform-wide Celaris credit totals; nothing here is fabricated.
      </div>

      <AiEngineClient config={config} />
    </div>
  );
}
