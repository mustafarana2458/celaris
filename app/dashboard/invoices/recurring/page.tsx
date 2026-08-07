import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { RecurringBillingPageClient } from "@/components/invoices/recurring/RecurringBillingPageClient";
import type { Contact, RecurringProfile } from "@/lib/types";

export default async function RecurringBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: profiles }, { data: contacts }] = workspace
    ? await Promise.all([
        supabase
          .from("recurring_profiles")
          .select("*, contacts(id, name, company, email)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("contacts")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
      ])
    : [{ data: [] as RecurringProfile[] }, { data: [] as Contact[] }];

  return (
    <RecurringBillingPageClient
      initialProfiles={(profiles as RecurringProfile[]) ?? []}
      contacts={(contacts as Pick<Contact, "id" | "name">[]) ?? []}
    />
  );
}
