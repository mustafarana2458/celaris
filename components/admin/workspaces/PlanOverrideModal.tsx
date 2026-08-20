"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const PLAN_LABELS: Record<string, string> = { free: "Free", solo: "Solo", team: "Team", scale: "Scale" };
const PROVIDER_LABELS: Record<string, string> = { lemonsqueezy: "Lemon Squeezy", safepay: "Safepay" };

type OverrideResponse = { ok: true; noChange: boolean; plan: string } | { ok: false; error: string };

export function PlanOverrideModal({
  open,
  onClose,
  workspaceId,
  currentPlan,
  activeSubscriptionProvider,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  currentPlan: string;
  activeSubscriptionProvider: string | null;
  onApplied: (newPlan: string) => void;
}) {
  const [newPlan, setNewPlan] = useState(currentPlan);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setNewPlan(currentPlan);
    setConfirming(false);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    let json: OverrideResponse | null = null;
    try {
      const res = await fetch("/api/admin/workspaces/plan-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, newPlan }),
      });
      json = (await res.json()) as OverrideResponse;
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error || "Could not override the plan.");
      return;
    }

    onApplied(json.plan);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Override plan">
      <div className="flex flex-col gap-4">
        {!confirming ? (
          <>
            <Select label="New plan" name="newPlan" value={newPlan} onChange={(e) => setNewPlan(e.target.value)} disabled={submitting}>
              <option value="free">Free</option>
              <option value="solo">Solo</option>
              <option value="team">Team</option>
              <option value="scale">Scale</option>
            </Select>

            {activeSubscriptionProvider && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                This workspace has an active paid subscription via {PROVIDER_LABELS[activeSubscriptionProvider] ?? activeSubscriptionProvider}.
                Overriding the plan here does <strong>not</strong> cancel or change their billing subscription -- it only
                changes what plan the workspace gets right now, independent of billing. A future billing event
                (renewal, cancellation, upgrade) can still update the plan again later and silently replace this
                override.
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={newPlan === currentPlan} onClick={() => setConfirming(true)}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Set this workspace&apos;s plan from <strong>{PLAN_LABELS[currentPlan] ?? currentPlan}</strong> to{" "}
              <strong>{PLAN_LABELS[newPlan] ?? newPlan}</strong>?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI credits used will be reset to 0 so the workspace gets the new plan&apos;s full allowance immediately.
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button type="button" loading={submitting} onClick={handleConfirm}>
                Apply override
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
