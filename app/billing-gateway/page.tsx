import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getRemainingCredits } from "@/lib/aiCreditsCore";
import { detailsForVariant, type BillingInterval } from "@/lib/lemonSqueezy";
import { tierAndIntervalForPlanId } from "@/lib/safepay";
import { BillingTab } from "@/app/dashboard/settings/tabs/BillingTab";
import { logOut } from "@/lib/actions/auth";
import type { WorkspaceSubscription } from "@/app/dashboard/settings/page";

// Celaris Improvements Phase 2A: the billing gate's destination page.
// Reuses BillingTab as-is (same component Settings > Billing renders) --
// no new checkout logic here, just a standalone wrapper with the same
// server-side data-fetch app/dashboard/settings/page.tsx already does,
// so BillingTab gets the exact props shape it expects. Not nested under
// /dashboard on purpose -- see lib/supabase/middleware.ts's
// resolveBillingGateRedirect for why that placement is what makes the
// redirect loop structurally impossible rather than just avoided.
//
// Does its own auth check (redirect to /login) rather than relying on
// middleware's PROTECTED_PREFIXES, matching the same self-check pattern
// already used by app/dashboard/settings/page.tsx and the admin pages --
// this route is deliberately NOT added to PROTECTED_PREFIXES, keeping
// that shared list untouched.
export default async function BillingGatewayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  // Already has paid access (or was never gated to begin with) -- nothing
  // to do here, send them into the real app instead of a checkout screen
  // they don't need.
  if (workspace && workspace.plan !== "free") {
    redirect("/dashboard");
  }

  const { data: subscriptionRow } = workspace
    ? await supabase
        .from("subscriptions")
        .select("plan_tier, variant_id, plan_id, provider, status, current_period_end")
        .eq("workspace_id", workspace.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<WorkspaceSubscription>()
    : { data: null };

  const subscriptionInterval: BillingInterval | null = subscriptionRow
    ? subscriptionRow.provider === "safepay"
      ? (tierAndIntervalForPlanId(subscriptionRow.plan_id)?.interval ?? null)
      : (detailsForVariant(subscriptionRow.variant_id)?.interval ?? null)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg dark:hidden" />
          <img src="/celaris-logo-white.png" alt="Celaris" className="hidden h-8 w-8 rounded-lg dark:block" />
          Celaris
        </Link>
        <form action={logOut}>
          <button
            type="submit"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Choose a plan to continue</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your workspace doesn&apos;t have an active subscription yet. Pick a plan below to unlock your dashboard.
          </p>
        </div>

        <BillingTab
          workspace={workspace}
          subscription={subscriptionRow ?? null}
          subscriptionInterval={subscriptionInterval}
          credits={workspace ? getRemainingCredits(workspace) : null}
        />
      </main>
    </div>
  );
}
