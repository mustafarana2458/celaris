import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { InvoicesPageClient } from "@/components/invoices/InvoicesPageClient";
import type { Contact, Invoice } from "@/lib/types";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const [{ data: invoices }, { data: contacts }] = workspace
    ? await Promise.all([
        supabase
          .from("invoices")
          .select("*, contacts(id, name, company, email), invoice_items(*)")
          .eq("workspace_id", workspace.id)
          .order("issued_at", { ascending: false })
          .order("position", { referencedTable: "invoice_items", ascending: true }),
        supabase
          .from("contacts")
          .select("id, name")
          .eq("workspace_id", workspace.id)
          .order("name", { ascending: true }),
      ])
    : [{ data: [] as Invoice[] }, { data: [] as Contact[] }];

  return (
    <InvoicesPageClient
      initialInvoices={(invoices as Invoice[]) ?? []}
      contacts={(contacts as Pick<Contact, "id" | "name">[]) ?? []}
    />
  );
}
