import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { SettingsPageClient } from "./SettingsPageClient";
import type { AiUsageChartView, UserProfile } from "@/lib/types";

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

  const [{ data: profile }, { data: workspaceRow }, { data: aiUsagePreference }] = await Promise.all([
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
  ]);

  const initialAiUsageChartView: AiUsageChartView = aiUsagePreference?.ai_usage_chart_view === "monthly" ? "monthly" : "daily";

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      profile={profile ?? null}
      workspace={workspace}
      workspaceBranding={workspaceRow ?? null}
      initialShowAiUsageWidget={aiUsagePreference?.show_ai_usage_widget ?? true}
      initialAiUsageChartView={initialAiUsageChartView}
    />
  );
}
