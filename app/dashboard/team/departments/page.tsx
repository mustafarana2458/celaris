import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export default async function DepartmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "team");

  return (
    <PlaceholderPage
      title="Departments"
      description="Organize workspace members into departments or groups."
      icon="team"
    />
  );
}
