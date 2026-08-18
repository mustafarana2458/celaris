"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createTestCheckout,
  getAiProviderMode,
  getWorkspacePlan,
  setAiProviderMode,
  setWorkspacePlan,
  verifyDevPanelPin,
} from "@/lib/actions/devPanel";
import type { AiProviderMode } from "@/lib/groq";

const CHECKOUT_OPTIONS: { tier: "solo" | "team" | "scale"; interval: "monthly" | "yearly"; label: string }[] = [
  { tier: "solo", interval: "monthly", label: "Solo / Monthly" },
  { tier: "solo", interval: "yearly", label: "Solo / Yearly" },
  { tier: "team", interval: "monthly", label: "Team / Monthly" },
  { tier: "team", interval: "yearly", label: "Team / Yearly" },
  { tier: "scale", interval: "monthly", label: "Scale / Monthly" },
  { tier: "scale", interval: "yearly", label: "Scale / Yearly" },
];

const MODE_OPTIONS: { value: AiProviderMode; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Groq (GPT OSS 120B) first, falls back to Mistral automatically." },
  { value: "auto2", label: "Auto 2", description: "Mistral first, falls back to Groq (GPT OSS 120B) automatically." },
  { value: "groq", label: "Groq (GPT OSS 120B)", description: "Always use Groq (GPT OSS 120B). No fallback." },
  { value: "mistral", label: "Force Mistral", description: "Always use Mistral. No fallback." },
];

const PLAN_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "free", label: "Free (legacy)", description: "No plan assigned -- treated as Solo's limit by default." },
  { value: "solo", label: "Solo", description: "500 AI credits/month." },
  { value: "team", label: "Team", description: "2,500 AI credits/month." },
  { value: "scale", label: "Scale", description: "10,000 AI credits/month." },
];

export function DevPanelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [mode, setMode] = useState<AiProviderMode | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<AiProviderMode | null>(null);
  const [switchingPlanTo, setSwitchingPlanTo] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setPin("");
    setVerifiedPin(null);
    setMode(null);
    setPlan(null);
    setError(null);
    setLoading(false);
    setSwitchingTo(null);
    setSwitchingPlanTo(null);
    setCheckoutLoading(null);
    onClose();
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);

    const pinResult = await verifyDevPanelPin(pin);
    if (!pinResult.ok) {
      setLoading(false);
      setError(pinResult.error ?? "Access denied.");
      setPin("");
      return;
    }

    const [modeResult, planResult] = await Promise.all([getAiProviderMode(pin), getWorkspacePlan(pin)]);
    setLoading(false);
    if (!modeResult.ok || !modeResult.mode || !planResult.ok || !planResult.plan) {
      setError(modeResult.error ?? planResult.error ?? "Access denied.");
      setPin("");
      return;
    }

    setVerifiedPin(pin);
    setMode(modeResult.mode);
    setPlan(planResult.plan);
  }

  async function handleSelectMode(next: AiProviderMode) {
    if (!verifiedPin || next === mode || switchingTo) return;
    setSwitchingTo(next);
    setError(null);

    const result = await setAiProviderMode(next, verifiedPin);
    setSwitchingTo(null);
    if (!result.ok) {
      setError(result.error ?? "Access denied.");
      return;
    }
    setMode(next);
  }

  async function handleSelectPlan(next: string) {
    if (!verifiedPin || next === plan || switchingPlanTo) return;
    setSwitchingPlanTo(next);
    setError(null);

    const result = await setWorkspacePlan(next, verifiedPin);
    setSwitchingPlanTo(null);
    if (!result.ok) {
      setError(result.error ?? "Access denied.");
      return;
    }
    setPlan(next);
  }

  async function handleTestCheckout(opt: (typeof CHECKOUT_OPTIONS)[number]) {
    if (!verifiedPin || checkoutLoading) return;
    const key = `${opt.tier}-${opt.interval}`;
    setCheckoutLoading(key);
    setError(null);

    const result = await createTestCheckout(opt.tier, opt.interval, verifiedPin);
    setCheckoutLoading(null);
    if (!result.ok || !result.url) {
      setError(result.error ?? "Access denied.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <Modal open={open} onClose={handleClose} title="Developer Panel">
      {!verifiedPin ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Enter the 6-digit access PIN.</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin.length === 6) handleVerify();
            }}
            placeholder="••••••"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-center text-lg tracking-[0.6em] text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleVerify} loading={loading} disabled={pin.length !== 6}>
              Unlock
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">AI provider mode</p>
          <div className="flex flex-col gap-2">
            {MODE_OPTIONS.map((opt) => {
              const isActive = mode === opt.value;
              const isSwitching = switchingTo === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectMode(opt.value)}
                  disabled={switchingTo !== null}
                  className={`flex flex-col gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-accent bg-accent/5 dark:bg-accent/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {opt.label}
                    {isSwitching ? (
                      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
                    ) : (
                      isActive && (
                        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-hover dark:bg-accent/20 dark:text-accent">
                          Active
                        </span>
                      )
                    )}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Workspace plan
            <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
              (manual -- no billing flow yet)
            </span>
          </p>
          <div className="flex flex-col gap-2">
            {PLAN_OPTIONS.map((opt) => {
              const isActive = plan === opt.value;
              const isSwitching = switchingPlanTo === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectPlan(opt.value)}
                  disabled={switchingPlanTo !== null}
                  className={`flex flex-col gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-accent bg-accent/5 dark:bg-accent/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {opt.label}
                    {isSwitching ? (
                      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
                    ) : (
                      isActive && (
                        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-hover dark:bg-accent/20 dark:text-accent">
                          Active
                        </span>
                      )
                    )}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Test Lemon Squeezy checkout
            <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
              (Phase 4 -- opens a real hosted checkout in test mode, not wired into Billing yet)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CHECKOUT_OPTIONS.map((opt) => {
              const key = `${opt.tier}-${opt.interval}`;
              const isLoading = checkoutLoading === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTestCheckout(opt)}
                  disabled={checkoutLoading !== null}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:border-slate-500"
                >
                  {opt.label}
                  {isLoading && (
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
