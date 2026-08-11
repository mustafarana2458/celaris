import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireModuleAccess } from "@/lib/permissions";
import { InvoicesPageClient } from "@/components/invoices/InvoicesPageClient";
import type { Contact, Invoice, InvoiceSenderDetails, Product, Project } from "@/lib/types";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  requireModuleAccess(workspace, "invoices", "all_invoices");

  const [{ data: invoices }, { data: contacts }, { data: projects }, { data: branding }, { data: products }] =
    workspace
      ? await Promise.all([
          supabase
            .from("invoices")
            .select("*, contacts(id, name, company, email), projects(id, name), invoice_items(*)")
            .eq("workspace_id", workspace.id)
            .order("issued_at", { ascending: false })
            .order("position", { referencedTable: "invoice_items", ascending: true }),
          supabase
            .from("contacts")
            .select("id, name")
            .eq("workspace_id", workspace.id)
            .order("name", { ascending: true }),
          supabase
            .from("projects")
            .select("id, name")
            .eq("workspace_id", workspace.id)
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("workspaces")
            .select("name, address, tax_number, support_email, phone, payment_instructions")
            .eq("id", workspace.id)
            .maybeSingle<InvoiceSenderDetails>(),
          supabase
            .from("products")
            .select("id, name, unit_price")
            .eq("workspace_id", workspace.id)
            .order("name", { ascending: true }),
        ])
      : [
          { data: [] as Invoice[] },
          { data: [] as Contact[] },
          { data: [] as Project[] },
          { data: null as InvoiceSenderDetails | null },
          { data: [] as Product[] },
        ];

  return (
    <InvoicesPageClient
      initialInvoices={(invoices as Invoice[]) ?? []}
      contacts={(contacts as Pick<Contact, "id" | "name">[]) ?? []}
      projects={(projects as Pick<Project, "id" | "name">[]) ?? []}
      products={(products as Pick<Product, "id" | "name" | "unit_price">[]) ?? []}
      senderDetails={branding as InvoiceSenderDetails | null}
    />
  );
}
