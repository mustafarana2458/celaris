"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getAiProviderMode, setAiProviderMode, verifyDevPanelPin } from "@/lib/actions/devPanel";
import type { AiProviderMode } from "@/lib/groq";

const MODE_OPTIONS: { value: AiProviderMode; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Groq first, falls back to Mistral automatically." },
  { value: "groq", label: "Force Groq", description: "Always use Groq. No fallback." },
  { value: "mistral", label: "Force Mistral", description: "Always use Mistral. No fallback." },
];

export function DevPanelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [mode, setMode] = useState<AiProviderMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<AiProviderMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setPin("");
    setVerifiedPin(null);
    setMode(null);
    setError(null);
    setLoading(false);
    setSwitchingTo(null);
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

    const modeResult = await getAiProviderMode(pin);
    setLoading(false);
    if (!modeResult.ok || !modeResult.mode) {
      setError(modeResult.error ?? "Access denied.");
      setPin("");
      return;
    }

    setVerifiedPin(pin);
    setMode(modeResult.mode);
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
