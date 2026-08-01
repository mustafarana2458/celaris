import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ContactsPageClient } from "@/components/contacts/ContactsPageClient";
import type { Company, Contact } from "@/lib/types";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: contacts }, { data: companies }, { data: tags }] = workspace
    ? await Promise.all([
        supabase
          .from("contacts")
          .select("*, companies(id, name), contact_tags(tags(id, name))")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase
          .from("tags")
          .select("name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
      ])
    : [{ data: [] as Contact[] }, { data: [] as Company[] }, { data: [] as { name: string }[] }];

  return (
    <ContactsPageClient
      initialContacts={(contacts as Contact[]) ?? []}
      companies={(companies as Pick<Company, "id" | "name">[]) ?? []}
      tagSuggestions={(tags ?? []).map((t) => t.name)}
    />
  );
}
