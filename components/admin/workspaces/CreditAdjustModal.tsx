"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Direction = "add" | "subtract";
type AdjustResponse = { ok: true; ai_credits_used: number } | { ok: false; error: string };

export function CreditAdjustModal({
  open,
  onClose,
  workspaceId,
  currentUsed,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUsed: number;
  onApplied: (newUsed: number) => void;
}) {
  const [direction, setDirection] = useState<Direction>("add");
  const [amount, setAmount] = useState("100");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount);
  const validAmount = Number.isInteger(parsedAmount) && parsedAmount > 0;
  // "Add" grants headroom by reducing ai_credits_used (floored at 0);
  // "Subtract" claws it back by increasing it. Computed here purely for
  // the confirmation preview -- the route recomputes this itself from the
  // DB's current value, not from whatever this modal displays.
  const previewNewUsed = validAmount
    ? direction === "add"
      ? Math.max(0, currentUsed - parsedAmount)
      : currentUsed + parsedAmount
    : currentUsed;

  function handleClose() {
    if (submitting) return;
    setDirection("add");
    setAmount("100");
    setConfirming(false);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    let json: AdjustResponse | null = null;
    try {
      const res = await fetch("/api/admin/workspaces/credit-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, direction, amount: parsedAmount }),
      });
      json = (await res.json()) as AdjustResponse;
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error || "Could not adjust credits.");
      return;
    }

    onApplied(json.ai_credits_used);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Adjust AI credits">
      <div className="flex flex-col gap-4">
        {!confirming ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credits are tracked as usage, not a balance -- &quot;Add&quot; gives the workspace more headroom (reduces
              credits used), &quot;Subtract&quot; takes headroom away (increases credits used). No gateway charge
              either way.
            </p>

            <div className="flex gap-3">
              <div className="flex-1">
                <Select label="Direction" name="direction" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} disabled={submitting}>
                  <option value="add">Add credits</option>
                  <option value="subtract">Subtract credits</option>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  label="Amount"
                  name="amount"
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Currently used: {currentUsed.toLocaleString()}. {validAmount ? `Will become: ${previewNewUsed.toLocaleString()}.` : ""}
            </p>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!validAmount} onClick={() => setConfirming(true)}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {direction === "add" ? "Add" : "Subtract"} {parsedAmount.toLocaleString()} credits for this workspace?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credits used: {currentUsed.toLocaleString()} &rarr; {previewNewUsed.toLocaleString()}.
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button type="button" loading={submitting} onClick={handleConfirm}>
                Apply adjustment
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
