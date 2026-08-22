"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { PromoCodeRow } from "@/app/admin/(protected)/promo-codes/page";

// Unambiguous uppercase alphanumeric charset (no 0/O, 1/I/L) -- 32
// characters exactly, so `byte % 32` below is unbiased (256 % 32 === 0).
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => CODE_CHARSET[b % CODE_CHARSET.length]).join("");
  return `CEL-${suffix}`;
}

type RewardType = "ai_credits" | "temp_plan_access";
type DurationPreset = "1" | "7" | "30" | "custom";

type CreateResponse = { ok: true; code: PromoCodeRow } | { ok: false; error: string; code?: string };

export function CreatePromoCodeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (code: PromoCodeRow) => void;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("ai_credits");
  const [credits, setCredits] = useState("500");
  const [plan, setPlan] = useState<"solo" | "team" | "scale">("team");
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("30");
  const [durationCustom, setDurationCustom] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setDescription("");
    setRewardType("ai_credits");
    setCredits("500");
    setPlan("team");
    setDurationPreset("30");
    setDurationCustom("");
    setMaxRedemptions("1");
    setExpiresAt("");
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const durationDays = durationPreset === "custom" ? Number(durationCustom) : Number(durationPreset);

    const body: Record<string, unknown> = {
      code,
      description,
      reward_type: rewardType,
      max_redemptions: Number(maxRedemptions),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
    if (rewardType === "ai_credits") {
      body.credits = Number(credits);
    } else {
      body.plan = plan;
      body.duration_days = durationDays;
    }

    setSubmitting(true);
    let json: CreateResponse | null = null;
    try {
      const res = await fetch("/api/admin/promo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      json = (await res.json()) as CreateResponse;
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error || "Could not create the promo code.");
      return;
    }

    onCreated(json.code);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create promo code">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CEL-WELCOME"
              maxLength={50}
              required
              disabled={submitting}
            />
          </div>
          <Button type="button" variant="secondary" disabled={submitting} onClick={() => setCode(generateCode())}>
            Generate
          </Button>
        </div>

        <Textarea
          label="Description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this code is for (internal note)"
          rows={2}
          disabled={submitting}
        />

        <Select
          label="Reward type"
          name="reward_type"
          value={rewardType}
          onChange={(e) => setRewardType(e.target.value as RewardType)}
          disabled={submitting}
        >
          <option value="ai_credits">AI Credits</option>
          <option value="temp_plan_access">Temporary Plan Access</option>
          {/* Discount needs checkout/gateway integration -- a later phase.
              Shown disabled rather than omitted so it's discoverable and
              obviously not silently missing. */}
          <option value="discount" disabled>
            Discount (coming soon)
          </option>
        </Select>

        {rewardType === "ai_credits" ? (
          <Input
            label="Credits"
            name="credits"
            type="number"
            min={1}
            step={1}
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            required
            disabled={submitting}
          />
        ) : (
          <div className="flex gap-3">
            <div className="flex-1">
              <Select
                label="Plan"
                name="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value as "solo" | "team" | "scale")}
                disabled={submitting}
              >
                <option value="solo">Solo</option>
                <option value="team">Team</option>
                <option value="scale">Scale</option>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                label="Duration"
                name="duration_preset"
                value={durationPreset}
                onChange={(e) => setDurationPreset(e.target.value as DurationPreset)}
                disabled={submitting}
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="custom">Custom...</option>
              </Select>
            </div>
            {durationPreset === "custom" && (
              <div className="flex-1">
                <Input
                  label="Days"
                  name="duration_custom"
                  type="number"
                  min={1}
                  step={1}
                  value={durationCustom}
                  onChange={(e) => setDurationCustom(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Max redemptions"
              name="max_redemptions"
              type="number"
              min={1}
              step={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Expires (optional)"
              name="expires_at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={submitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create code
          </Button>
        </div>
      </form>
    </Modal>
  );
}
