"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { ContactType } from "@/lib/types";

export type ContactActionResult = { error?: string };

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

function parseTags(raw: FormDataEntryValue | null): string[] {
  const str = String(raw ?? "").trim();
  if (!str) return [];
  return str
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function contactFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "lead").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const type: ContactType = typeRaw === "customer" ? "customer" : "lead";

  return {
    name,
    email: email || null,
    phone: phone || null,
    company: company || null,
    type,
    notes: notes || null,
    tags: parseTags(formData.get("tags")),
  };
}

export async function createContact(formData: FormData): Promise<ContactActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = contactFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase.from("contacts").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  return {};
}

export async function updateContact(
  id: string,
  formData: FormData
): Promise<ContactActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = contactFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase
    .from("contacts")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  return {};
}

export async function deleteContact(id: string): Promise<ContactActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  return {};
}
