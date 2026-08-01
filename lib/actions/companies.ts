"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { CompanyIndustry, CompanySize } from "@/lib/types";

export type CompanyActionResult = {
  error?: string;
  company?: { id: string; name: string };
};

const INDUSTRIES: CompanyIndustry[] = ["Tech", "Finance", "Retail", "Healthcare", "Other"];
const SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "200+"];

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

function companyFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const industryRaw = String(formData.get("industry") ?? "").trim();
  const sizeRaw = String(formData.get("size") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const industry = INDUSTRIES.includes(industryRaw as CompanyIndustry)
    ? (industryRaw as CompanyIndustry)
    : null;
  const size = SIZES.includes(sizeRaw as CompanySize) ? (sizeRaw as CompanySize) : null;

  return {
    name,
    website: website || null,
    industry,
    size,
    location: location || null,
    notes: notes || null,
  };
}

export async function createCompany(formData: FormData): Promise<CompanyActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = companyFields(formData);
  if (!fields.name) {
    return { error: "Company name is required." };
  }

  const { data, error } = await ctx.supabase
    .from("companies")
    .insert({ ...fields, workspace_id: ctx.workspace.id })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/contacts");
  return { company: data };
}

export async function updateCompany(
  id: string,
  formData: FormData
): Promise<CompanyActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = companyFields(formData);
  if (!fields.name) {
    return { error: "Company name is required." };
  }

  const { error } = await ctx.supabase
    .from("companies")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/contacts");
  return {};
}

export async function deleteCompany(id: string): Promise<CompanyActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("companies")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/contacts");
  return {};
}
