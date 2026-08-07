import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ProductLibraryPageClient } from "@/components/invoices/productLibrary/ProductLibraryPageClient";
import type { Product } from "@/lib/types";

export default async function ProductLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  const { data: products } = workspace
    ? await supabase
        .from("products")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("name", { ascending: true })
    : { data: [] as Product[] };

  return <ProductLibraryPageClient initialProducts={(products as Product[]) ?? []} />;
}
