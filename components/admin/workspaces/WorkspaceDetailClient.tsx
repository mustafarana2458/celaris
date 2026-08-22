"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getPlanLimit } from "@/lib/aiCreditsCore";
import { PlanOverrideModal } from "./PlanOverrideModal";
import { CreditAdjustModal } from "./CreditAdjustModal";
import type { AdminWorkspaceDetail } from "@/app/admin/(protected)/workspaces/[id]/page";

const PLAN_LABELS: Record<string, string> = { free: "Free", solo: "Solo", team: "Team", scale: "Scale" };
const PROVIDER_LABELS: Record<string, string> = { lemonsqueezy: "Lemon Squeezy", safepay: "Safepay" };

export function WorkspaceDetailClient({ workspace }: { workspace: AdminWorkspaceDetail }) {
  const router = useRouter();
  const [plan, setPlan] = useState(workspace.plan);
  const [creditsUsed, setCreditsUsed] = useState(workspace.ai_credits_used);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const limit = getPlanLimit(plan);

  function handlePlanApplied(newPlan: string) {
    setPlan(newPlan);
    setCreditsUsed(0);
    router.refresh();
  }

  function handleCreditsApplied(newUsed: number) {
    setCreditsUsed(newUsed);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/workspaces" className="text-xs font-medium text-accent-hover hover:underline dark:text-accent">
          &larr; All workspaces
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{workspace.name}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Owner: {workspace.ownerEmail ?? "--"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Plan</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{PLAN_LABELS[plan] ?? plan}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">AI credits used</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {creditsUsed.toLocaleString()} / {limit.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Subscription</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {workspace.activeSubscriptionProvider ? PROVIDER_LABELS[workspace.activeSubscriptionProvider] ?? workspace.activeSubscriptionProvider : "None"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Both actions are audit-logged and require confirmation before applying.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => setPlanModalOpen(true)}>
            Override plan
          </Button>
          <Button type="button" variant="secondary" onClick={() => setCreditModalOpen(true)}>
            Adjust AI credits
          </Button>
        </div>
      </div>

      <PlanOverrideModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        workspaceId={workspace.id}
        currentPlan={plan}
        activeSubscriptionProvider={workspace.activeSubscriptionProvider}
        onApplied={handlePlanApplied}
      />
      <CreditAdjustModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        workspaceId={workspace.id}
        currentUsed={creditsUsed}
        onApplied={handleCreditsApplied}
      />
    </div>
  );
}
