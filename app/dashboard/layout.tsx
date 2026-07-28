import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceContext";
import type { UserProfile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, workspace] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, business_name, plan")
      .eq("id", user.id)
      .maybeSingle<Pick<UserProfile, "full_name" | "business_name" | "plan">>(),
    getCurrentWorkspace(supabase, user.id),
  ]);

  return (
    <WorkspaceProvider workspace={workspace}>
      <DashboardShell
        fullName={profile?.full_name || user.email || "there"}
        businessName={workspace?.name || profile?.business_name || "Your business"}
      >
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  );
}
