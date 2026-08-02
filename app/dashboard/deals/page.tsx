import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { DealsPageClient } from "@/components/deals/DealsPageClient";
import type { Contact, Deal } from "@/lib/types";

export default async function DealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: deals }, { data: contacts }] = workspace
    ? await Promise.all([
        supabase
          .from("deals")
          .select("*, contacts(id, name, company, companies(name))")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("contacts")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
      ])
    : [{ data: [] as Deal[] }, { data: [] as Contact[] }];

  return (
    <DealsPageClient
      initialDeals={(deals as Deal[]) ?? []}
      contacts={(contacts as Pick<Contact, "id" | "name">[]) ?? []}
    />
  );
}
