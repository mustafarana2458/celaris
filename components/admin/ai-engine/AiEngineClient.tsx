"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { AiProviderMode } from "@/lib/groq";
import type { AiEngineConfig } from "@/app/admin/ai-engine/page";

const STRATEGY_OPTIONS: { value: AiProviderMode; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Primary: Groq (GPT OSS 120B). Fallback: Mistral Small, automatically." },
  { value: "auto2", label: "Auto 2", description: "Primary: Mistral Small. Fallback: Groq (GPT OSS 120B), automatically." },
  { value: "groq", label: "Dedicated Groq", description: "Always Groq (GPT OSS 120B). No fallback -- a Groq outage surfaces as an AI error." },
  { value: "mistral", label: "Force Mistral", description: "Always Mistral Small. No fallback -- a Mistral outage surfaces as an AI error." },
];

type PendingChange =
  | { type: "strategy"; value: AiProviderMode; label: string }
  | { type: "openai"; value: boolean }
  | { type: "threshold"; value: number };

type ApiResult<T> = ({ ok: true; noChange: boolean } & T) | { ok: false; error: string };

async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}

export function AiEngineClient({ config }: { config: AiEngineConfig }) {
  const router = useRouter();
  const [strategy, setStrategy] = useState(config.strategy);
  const [openaiFallbackEnabled, setOpenaiFallbackEnabled] = useState(config.openaiFallbackEnabled);
  const [groqLatencyThresholdMs, setGroqLatencyThresholdMs] = useState(config.groqLatencyThresholdMs);
  const [thresholdInput, setThresholdInput] = useState(String(config.groqLatencyThresholdMs));

  const [pending, setPending] = useState<PendingChange | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeConfirm() {
    if (submitting) return;
    setPending(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!pending || submitting) return;
    setSubmitting(true);
    setError(null);

    if (pending.type === "strategy") {
      const result = await postJson<{ strategy: AiProviderMode }>("/api/admin/ai-engine/strategy", { strategy: pending.value });
      setSubmitting(false);
      if (!result.ok) return setError(result.error);
      setStrategy(result.strategy);
    } else if (pending.type === "openai") {
      const result = await postJson<{ enabled: boolean }>("/api/admin/ai-engine/openai-fallback", { enabled: pending.value });
      setSubmitting(false);
      if (!result.ok) return setError(result.error);
      setOpenaiFallbackEnabled(result.enabled);
    } else {
      const result = await postJson<{ groqLatencyThresholdMs: number }>("/api/admin/ai-engine/thresholds", {
        groqLatencyThresholdMs: pending.value,
      });
      setSubmitting(false);
      if (!result.ok) return setError(result.error);
      setGroqLatencyThresholdMs(result.groqLatencyThresholdMs);
      setThresholdInput(String(result.groqLatencyThresholdMs));
    }

    setPending(null);
    router.refresh();
  }

  const parsedThreshold = Number(thresholdInput);
  const validThreshold = Number.isInteger(parsedThreshold) && parsedThreshold >= 500 && parsedThreshold <= 30_000;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Routing strategy</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Applies to every AI request across the platform. Takes effect within ~5 seconds -- no redeploy.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {STRATEGY_OPTIONS.map((opt) => {
            const isActive = strategy === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !isActive && setPending({ type: "strategy", value: opt.value, label: opt.label })}
                disabled={isActive}
                className={`flex flex-col gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${
                  isActive
                    ? "border-accent bg-accent/5 dark:bg-accent/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {opt.label}
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-hover dark:bg-accent/20 dark:text-accent">
                      Active
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">OpenAI fallback safety net</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          If every provider the routing strategy above allows has already failed, retry once more with GPT-4o-mini
          before giving up. Requires <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-700">OPENAI_API_KEY</code> to
          be set -- otherwise this has no effect even when enabled.
        </p>
        <button
          type="button"
          onClick={() => setPending({ type: "openai", value: !openaiFallbackEnabled })}
          className={`mt-4 flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
            openaiFallbackEnabled
              ? "border-accent bg-accent/5 dark:bg-accent/10"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
          }`}
        >
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {openaiFallbackEnabled ? "Enabled" : "Disabled"}
          </span>
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              openaiFallbackEnabled ? "bg-accent" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                openaiFallbackEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Groq latency threshold</h3>
        <div className="mt-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Saved here for reference only -- <strong>not enforced yet</strong>. Live requests still rely on Groq&apos;s own
          30s timeout / retry behavior, not this threshold. Wiring this in would change request timing for every AI
          call platform-wide, so it&apos;s deliberately left as a separate, reviewed change.
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="w-40">
            <Input
              label="Threshold (ms)"
              name="groqLatencyThresholdMs"
              type="number"
              min={500}
              max={30000}
              step={100}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!validThreshold || parsedThreshold === groqLatencyThresholdMs}
            onClick={() => setPending({ type: "threshold", value: parsedThreshold })}
          >
            Save
          </Button>
        </div>
      </div>

      <Modal open={pending !== null} onClose={closeConfirm} title="Confirm AI routing change">
        {pending && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {pending.type === "strategy" && (
                <>
                  Change the platform-wide routing strategy from <strong>{STRATEGY_OPTIONS.find((o) => o.value === strategy)?.label}</strong> to{" "}
                  <strong>{pending.label}</strong>? This affects every AI request across every workspace immediately.
                </>
              )}
              {pending.type === "openai" && (
                <>
                  {pending.value ? "Enable" : "Disable"} the OpenAI fallback safety net? This affects every AI request
                  across every workspace immediately.
                </>
              )}
              {pending.type === "threshold" && (
                <>
                  Save the Groq latency threshold as <strong>{pending.value}ms</strong>? This is stored for reference
                  only and is not yet enforced by live requests.
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This change is audit-logged.</p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={closeConfirm}>
                Cancel
              </Button>
              <Button type="button" loading={submitting} onClick={handleConfirm}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
