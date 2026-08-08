import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { CompaniesPageClient } from "@/components/companies/CompaniesPageClient";
import type { Company } from "@/lib/types";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "contacts");

  const { data: companies } = workspace
    ? await supabase
        .from("companies")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
    : { data: [] as Company[] };

  return <CompaniesPageClient initialCompanies={(companies as Company[]) ?? []} />;
}
