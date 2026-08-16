import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace, listUserWorkspaces } from "@/lib/workspace";
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

  const [{ data: profile }, workspace, workspaces] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, business_name, avatar_url, plan")
      .eq("id", user.id)
      .maybeSingle<Pick<UserProfile, "full_name" | "business_name" | "avatar_url" | "plan">>(),
    getCurrentWorkspace(supabase, user.id),
    listUserWorkspaces(supabase, user.id),
  ]);

  return (
    <WorkspaceProvider workspace={workspace}>
      <DashboardShell
        fullName={profile?.full_name || user.email || "there"}
        avatarUrl={profile?.avatar_url ?? null}
        activeWorkspace={
          workspace ? { id: workspace.id, name: workspace.name, logoUrl: workspace.logoUrl } : null
        }
        workspaces={workspaces}
      >
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  );
}
