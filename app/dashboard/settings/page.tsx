import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { getRemainingCredits } from "@/lib/aiCreditsCore";
import { detailsForVariant, type BillingInterval } from "@/lib/lemonSqueezy";
import { tierAndIntervalForPlanId } from "@/lib/safepay";
import { SettingsPageClient } from "./SettingsPageClient";
import type { AiUsageChartView, UserProfile } from "@/lib/types";

export type WorkspaceSubscription = {
  plan_tier: "solo" | "team" | "scale";
  // Nullable now that Safepay rows share this table (see
  // sql/subscriptions_schema.sql's Safepay migration) -- a Safepay row's
  // interval is derived from plan_id via tierAndIntervalForPlanId() instead.
  variant_id: string | null;
  plan_id: string | null;
  provider: "lemonsqueezy" | "safepay";
  status: string;
  current_period_end: string | null;
};

export type WorkspaceBranding = {
  id: string;
  name: string;
  support_email: string | null;
  tax_number: string | null;
  currency: string | null;
  address: string | null;
  phone: string | null;
  payment_instructions: string | null;
  logo_url: string | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "settings");

  const [{ data: profile }, { data: workspaceRow }, { data: aiUsagePreference }, { data: subscriptionRow }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, business_name, phone, avatar_url, plan, created_at")
        .eq("id", user.id)
        .maybeSingle<UserProfile>(),
      workspace
        ? supabase
            .from("workspaces")
            .select("id, name, support_email, tax_number, currency, address, phone, payment_instructions, logo_url")
            .eq("id", workspace.id)
            .maybeSingle<WorkspaceBranding>()
        : Promise.resolve({ data: null }),
      workspace
        ? supabase
            .from("user_preferences")
            .select("show_ai_usage_widget, ai_usage_chart_view")
            .eq("user_id", user.id)
            .eq("workspace_id", workspace.id)
            .maybeSingle<{ show_ai_usage_widget: boolean | null; ai_usage_chart_view: string | null }>()
        : Promise.resolve({ data: null }),
      // Most recently touched row -- a workspace can accumulate multiple
      // historical subscriptions (see sql/subscriptions_schema.sql) if it
      // was cancelled and later resubscribed under a new
      // lemon_subscription_id/safepay_subscription_id (or switched
      // gateways entirely); the latest one is the one BillingTab cares
      // about, regardless of which provider it's on. RLS
      // (subscriptions_select_workspace_members) allows any member to
      // read this, same as workspaceRow above.
      workspace
        ? supabase
            .from("subscriptions")
            .select("plan_tier, variant_id, plan_id, provider, status, current_period_end")
            .eq("workspace_id", workspace.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle<WorkspaceSubscription>()
        : Promise.resolve({ data: null }),
    ]);

  const initialAiUsageChartView: AiUsageChartView = aiUsagePreference?.ai_usage_chart_view === "monthly" ? "monthly" : "daily";

  // Derived here, server-side, rather than inside BillingTab: both
  // detailsForVariant() and tierAndIntervalForPlanId() read plain
  // (non-NEXT_PUBLIC_) env vars, which are stripped from the client
  // bundle. BillingTab is a "use client" component -- calling either
  // function there would silently look up against empty maps in the
  // browser and always return null, which is exactly why the current-plan
  // card never matched its interval and kept showing a Switch button
  // instead of "Current Plan". Computing it here, in a Server Component,
  // and passing the result down as a plain value sidesteps that entirely.
  const subscriptionInterval: BillingInterval | null = subscriptionRow
    ? subscriptionRow.provider === "safepay"
      ? (tierAndIntervalForPlanId(subscriptionRow.plan_id)?.interval ?? null)
      : (detailsForVariant(subscriptionRow.variant_id)?.interval ?? null)
    : null;

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      profile={profile ?? null}
      workspace={workspace}
      workspaceBranding={workspaceRow ?? null}
      initialShowAiUsageWidget={aiUsagePreference?.show_ai_usage_widget ?? true}
      initialAiUsageChartView={initialAiUsageChartView}
      subscription={subscriptionRow ?? null}
      subscriptionInterval={subscriptionInterval}
      credits={workspace ? getRemainingCredits(workspace) : null}
    />
  );
}
