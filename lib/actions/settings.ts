"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type SettingsActionResult = { error?: string };

const CURRENCIES = ["USD", "EUR", "PKR", "GBP"];

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

  return { supabase, workspace, user } as const;
}

export async function updateProfile(formData: FormData): Promise<SettingsActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    return { error: "Full name is required." };
  }

  const { error } = await ctx.supabase
    .from("users")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", ctx.user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return {};
}

export async function updateAvatarUrl(avatarUrl: string): Promise<SettingsActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!avatarUrl || !avatarUrl.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
    return { error: "Invalid image URL." };
  }

  const { error } = await ctx.supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", ctx.user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return {};
}

export async function updateWorkspaceBranding(formData: FormData): Promise<SettingsActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (ctx.workspace.role !== "owner") {
    return { error: "Only the workspace owner can update these settings." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const supportEmail = String(formData.get("support_email") ?? "").trim();
  const taxNumber = String(formData.get("tax_number") ?? "").trim();
  const currencyRaw = String(formData.get("currency") ?? "USD").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const paymentInstructions = String(formData.get("payment_instructions") ?? "").trim();
  const currency = CURRENCIES.includes(currencyRaw) ? currencyRaw : "USD";

  if (!name) {
    return { error: "Workspace name is required." };
  }

  const { error } = await ctx.supabase
    .from("workspaces")
    .update({
      name,
      support_email: supportEmail || null,
      tax_number: taxNumber || null,
      currency,
      address: address || null,
      phone: phone || null,
      payment_instructions: paymentInstructions || null,
    })
    .eq("id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return {};
}

export async function updateWorkspaceLogoUrl(logoUrl: string): Promise<SettingsActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (ctx.workspace.role !== "owner") {
    return { error: "Only the workspace owner can update these settings." };
  }

  if (!logoUrl || !logoUrl.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
    return { error: "Invalid image URL." };
  }

  const { error: logoError } = await ctx.supabase
    .from("workspaces")
    .update({ logo_url: logoUrl })
    .eq("id", ctx.workspace.id);

  if (logoError) return { error: logoError.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return {};
}
