import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { SettingsPageClient } from "./SettingsPageClient";
import type { UserProfile } from "@/lib/types";

export type WorkspaceBranding = {
  id: string;
  name: string;
  support_email: string | null;
  tax_number: string | null;
  currency: string | null;
  address: string | null;
  phone: string | null;
  payment_instructions: string | null;
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

  const [{ data: profile }, { data: workspaceRow }] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, business_name, phone, avatar_url, plan, created_at")
      .eq("id", user.id)
      .maybeSingle<UserProfile>(),
    workspace
      ? supabase
          .from("workspaces")
          .select("id, name, support_email, tax_number, currency, address, phone, payment_instructions")
          .eq("id", workspace.id)
          .maybeSingle<WorkspaceBranding>()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      profile={profile ?? null}
      workspace={workspace}
      workspaceBranding={workspaceRow ?? null}
    />
  );
}
