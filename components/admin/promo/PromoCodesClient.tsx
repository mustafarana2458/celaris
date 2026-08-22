"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CreatePromoCodeModal } from "./CreatePromoCodeModal";
import type { PromoCodeRow } from "@/app/admin/(protected)/promo-codes/page";

function summarizeReward(rewardType: string, rewardPayload: Record<string, unknown>): string {
  if (rewardType === "ai_credits") {
    const credits = Number(rewardPayload.credits ?? 0);
    return `+${credits.toLocaleString()} credits`;
  }
  if (rewardType === "temp_plan_access") {
    const plan = typeof rewardPayload.plan === "string" ? rewardPayload.plan : "?";
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    const days = Number(rewardPayload.duration_days ?? 0);
    return `${planLabel}, ${days}d`;
  }
  return rewardType;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type ToggleResponse = { ok: true; id: string; is_active: boolean } | { ok: false; error: string };

export function PromoCodesClient({ initialCodes }: { initialCodes: PromoCodeRow[] }) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreated(created: PromoCodeRow) {
    setCodes((prev) => [created, ...prev]);
    // Reconciles with the DB (e.g. if two admins are creating codes at
    // once) -- the optimistic prepend above is just for instant feedback.
    router.refresh();
  }

  async function handleToggle(row: PromoCodeRow) {
    if (togglingId) return;
    const nextActive = !row.is_active;
    setTogglingId(row.id);
    setError(null);

    let json: ToggleResponse | null = null;
    try {
      const res = await fetch("/api/admin/promo/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, is_active: nextActive }),
      });
      json = (await res.json()) as ToggleResponse;
    } catch {
      setTogglingId(null);
      setError("Could not reach the server. Try again.");
      return;
    }
    setTogglingId(null);

    if (!json.ok) {
      setError(json.error || "Could not update the code.");
      return;
    }

    const updatedActive = json.is_active;
    setCodes((prev) => prev.map((c) => (c.id === row.id ? { ...c, is_active: updatedActive } : c)));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Promo Codes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generate and manage promo codes. Redemption already works from the billing side.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create code
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {codes.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No promo codes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="px-6 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Reward</th>
                  <th className="px-4 py-3 font-medium">Redemptions</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{row.code}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                      {row.description || "--"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{summarizeReward(row.reward_type, row.reward_payload)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {row.current_redemptions} / {row.max_redemptions}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          row.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {row.is_active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(row.expires_at)}</td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-1.5 text-xs"
                        loading={togglingId === row.id}
                        disabled={togglingId !== null && togglingId !== row.id}
                        onClick={() => handleToggle(row)}
                      >
                        {row.is_active ? "Pause" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreatePromoCodeModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
