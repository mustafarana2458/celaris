import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ContactsPageClient } from "@/components/contacts/ContactsPageClient";
import { DEFAULT_PAGE_SIZE } from "@/lib/actions/contacts";
import type { Company, Contact, Tag } from "@/lib/types";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: contacts, count }, { data: companies }, { data: tags }] = workspace
    ? await Promise.all([
        supabase
          .from("contacts")
          .select("*, companies(id, name), contact_tags(tags(id, name))", { count: "exact" })
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .range(0, DEFAULT_PAGE_SIZE - 1),
        supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
        supabase
          .from("tags")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
      ])
    : [
        { data: [] as Contact[], count: 0 },
        { data: [] as Company[] },
        { data: [] as Pick<Tag, "id" | "name">[] },
      ];

  return (
    <ContactsPageClient
      initialContacts={(contacts as Contact[]) ?? []}
      initialTotal={count ?? 0}
      companies={(companies as Pick<Company, "id" | "name">[]) ?? []}
      tags={(tags as Pick<Tag, "id" | "name">[]) ?? []}
    />
  );
}
