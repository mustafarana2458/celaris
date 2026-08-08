import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { DepartmentsPageClient } from "@/components/team/departments/DepartmentsPageClient";
import type { Department } from "@/lib/types";

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

  const [{ data: departments }, { data: memberRows }] = workspace
    ? await Promise.all([
        supabase
          .from("departments")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("department_name", { ascending: true }),
        supabase.from("department_members").select("department_id").eq("workspace_id", workspace.id),
      ])
    : [{ data: [] as Department[] }, { data: [] as { department_id: string }[] }];

  const memberCounts: Record<string, number> = {};
  for (const row of (memberRows as { department_id: string }[] | null) ?? []) {
    memberCounts[row.department_id] = (memberCounts[row.department_id] ?? 0) + 1;
  }

  const canManage = workspace?.role === "owner" || workspace?.role === "admin";

  return (
    <DepartmentsPageClient
      departments={(departments as Department[]) ?? []}
      memberCounts={memberCounts}
      canManage={canManage}
    />
  );
}
