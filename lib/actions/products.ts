"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";

export type ProductActionResult = { error?: string };

async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." } as const;
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return { error: "No workspace found for this account." } as const;
  }

  return { supabase, workspace } as const;
}

function productFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unitPriceRaw = String(formData.get("unit_price") ?? "").trim();
  const unitPriceParsed = unitPriceRaw === "" ? 0 : Number(unitPriceRaw);
  const unitPrice = Number.isFinite(unitPriceParsed) ? Math.max(0, unitPriceParsed) : 0;
  const taxable = formData.get("taxable") === "on";

  return {
    name,
    description: description || null,
    unit_price: unitPrice,
    taxable,
  };
}

export async function createProduct(formData: FormData): Promise<ProductActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "product_library");
  if (permError) return permError;

  const fields = productFields(formData);
  if (!fields.name) {
    return { error: "Item name is required." };
  }

  const { error } = await ctx.supabase.from("products").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/product-library");
  return {};
}

export async function updateProduct(id: string, formData: FormData): Promise<ProductActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "product_library");
  if (permError) return permError;

  const fields = productFields(formData);
  if (!fields.name) {
    return { error: "Item name is required." };
  }

  const { error } = await ctx.supabase
    .from("products")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/product-library");
  return {};
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "product_library");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/product-library");
  return {};
}
