import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ContactsPageClient } from "@/components/contacts/ContactsPageClient";
import type { Contact } from "@/lib/types";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const { data: contacts } = workspace
    ? await supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
    : { data: [] as Contact[] };

  return <ContactsPageClient initialContacts={(contacts as Contact[]) ?? []} />;
}
