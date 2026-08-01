"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
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

function parseTagNames(formData: FormData): string[] {
  const raw = formData
    .getAll("tags")
    .map((v) => String(v).trim())
    .filter(Boolean);

  // De-duplicate case-insensitively, keeping the first-seen casing.
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of raw) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(t);
  }
  return result;
}

// Upserts any new tag names into the workspace's tag set, then replaces this
// contact's tag links to match exactly the given set.
async function syncContactTags(
  supabase: SupabaseClient,
  workspaceId: string,
  contactId: string,
  tagNames: string[]
) {
  if (tagNames.length > 0) {
    const { error: upsertError } = await supabase
      .from("tags")
      .upsert(
        tagNames.map((name) => ({ workspace_id: workspaceId, name })),
        { onConflict: "workspace_id,name", ignoreDuplicates: true }
      );
    if (upsertError) throw upsertError;
  }

  const { data: tagRows, error: fetchError } = tagNames.length
    ? await supabase
        .from("tags")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .in("name", tagNames)
    : { data: [] as { id: string; name: string }[], error: null };
  if (fetchError) throw fetchError;

  const { error: deleteError } = await supabase
    .from("contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("workspace_id", workspaceId);
  if (deleteError) throw deleteError;

  if (tagRows && tagRows.length > 0) {
    const { error: insertError } = await supabase.from("contact_tags").insert(
      tagRows.map((t) => ({
        workspace_id: workspaceId,
        contact_id: contactId,
        tag_id: t.id,
      }))
    );
    if (insertError) throw insertError;
  }
}

function contactFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyId = String(formData.get("company_id") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "lead").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const type: ContactType = typeRaw === "customer" ? "customer" : "lead";
  const tagNames = parseTagNames(formData);

  return {
    name,
    email: email || null,
    phone: phone || null,
    company_id: companyId || null,
    // Denormalized copy of the linked company's name, kept for backward
    // compatibility with the older free-text "company" column.
    company: companyName || null,
    type,
    notes: notes || null,
    // Legacy denormalized array column, kept for backward compatibility with
    // code that still reads contacts.tags directly (e.g. the AI follow-up
    // prompt). The real source of truth is the tags/contact_tags tables.
    tags: tagNames,
  };
}

export async function createContact(formData: FormData): Promise<ContactActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = contactFields(formData);
  if (!fields.name) {
    return { error: "Name is required." };
  }

  const { data, error } = await ctx.supabase
    .from("contacts")
    .insert({ ...fields, workspace_id: ctx.workspace.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  try {
    await syncContactTags(ctx.supabase, ctx.workspace.id, data.id, fields.tags);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save tags." };
  }

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

  try {
    await syncContactTags(ctx.supabase, ctx.workspace.id, id, fields.tags);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save tags." };
  }

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
