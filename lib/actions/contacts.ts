"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type Contact,
  type ContactActionResult,
  type ContactsQuery,
  type ContactsQueryResult,
  type ContactType,
} from "@/lib/types";

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

// Splits a full name on the first space: "Bilal Rana" -> ("Bilal", "Rana"),
// "Cher" -> ("Cher", null). Used as a fallback wherever a caller only sends
// a single "name" field -- notably the AI assistant's create-contact tool,
// which predates first_name/last_name and still only sets "name".
function splitName(fullName: string): { firstName: string; lastName: string | null } {
  const trimmed = fullName.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return { firstName: trimmed, lastName: null };
  return { firstName: trimmed.slice(0, firstSpace), lastName: trimmed.slice(firstSpace + 1).trim() || null };
}

function contactFields(formData: FormData) {
  const nameInput = String(formData.get("name") ?? "").trim();
  const firstNameInput = String(formData.get("first_name") ?? "").trim();
  const lastNameInput = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyId = String(formData.get("company_id") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "lead").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const type: ContactType = typeRaw === "customer" ? "customer" : "lead";
  const tagNames = parseTagNames(formData);

  let firstName = firstNameInput;
  let lastName: string | null = lastNameInput || null;
  if (!firstName && nameInput) {
    const split = splitName(nameInput);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  // "name" stays the source of truth for every existing read (search,
  // CSV export, dashboard avatars, the AI follow-up context block) --
  // computed from first/last so nothing else has to change.
  const name = nameInput || [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    name,
    first_name: firstName || null,
    last_name: lastName,
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
    return { error: "First name is required." };
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
    return { error: "First name is required." };
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

export async function listContacts(
  query: Partial<ContactsQuery>
): Promise<ContactsQueryResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return { error: ctx.error ?? "Something went wrong." };

  const {
    search = "",
    type = "all",
    tagIds = [],
    companyId = "",
    dateFrom = "",
    dateTo = "",
    missingPhone = false,
    missingCompany = false,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = query;

  // Tag filtering is resolved separately (rather than an embedded !inner
  // join) to avoid row fan-out when a contact matches more than one of the
  // selected tags, which would otherwise duplicate rows and break the count.
  let tagContactIds: string[] | null = null;
  if (tagIds.length > 0) {
    const { data: tagLinks, error: tagLinkError } = await ctx.supabase
      .from("contact_tags")
      .select("contact_id")
      .eq("workspace_id", ctx.workspace.id)
      .in("tag_id", tagIds);

    if (tagLinkError) return { error: tagLinkError.message };

    tagContactIds = Array.from(new Set((tagLinks ?? []).map((t) => t.contact_id)));
    if (tagContactIds.length === 0) {
      return { contacts: [], total: 0 };
    }
  }

  let q = ctx.supabase
    .from("contacts")
    .select("*, companies(id, name), contact_tags(tags(id, name))", { count: "exact" })
    .eq("workspace_id", ctx.workspace.id);

  if (type !== "all") q = q.eq("type", type);
  if (companyId) q = q.eq("company_id", companyId);
  if (missingPhone) q = q.is("phone", null);
  if (missingCompany) q = q.is("company_id", null);
  if (dateFrom) q = q.gte("created_at", dateFrom);
  if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59.999`);
  if (tagContactIds) q = q.in("id", tagContactIds);

  const trimmedSearch = search.trim().replace(/,/g, "");
  if (trimmedSearch) {
    q = q.or(
      `name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%,company.ilike.%${trimmedSearch}%`
    );
  }

  const safePageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize)
    ? pageSize
    : DEFAULT_PAGE_SIZE;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { error: error.message };

  return { contacts: (data as Contact[]) ?? [], total: count ?? 0 };
}

export async function bulkDeleteContacts(ids: string[]): Promise<ContactActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;
  if (ids.length === 0) return {};

  const { error } = await ctx.supabase
    .from("contacts")
    .delete()
    .eq("workspace_id", ctx.workspace.id)
    .in("id", ids);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts");
  return {};
}

export async function bulkAddTagToContacts(
  ids: string[],
  tagName: string
): Promise<ContactActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const name = tagName.trim();
  if (!name || ids.length === 0) return {};

  const { error: upsertError } = await ctx.supabase
    .from("tags")
    .upsert(
      { workspace_id: ctx.workspace.id, name },
      { onConflict: "workspace_id,name", ignoreDuplicates: true }
    );
  if (upsertError) return { error: upsertError.message };

  const { data: tagRow, error: tagFetchError } = await ctx.supabase
    .from("tags")
    .select("id")
    .eq("workspace_id", ctx.workspace.id)
    .eq("name", name)
    .single();
  if (tagFetchError || !tagRow) {
    return { error: tagFetchError?.message ?? "Tag not found." };
  }

  // Re-verify the ids actually belong to this workspace — RLS on contact_tags
  // only checks contact_tags.workspace_id, not that contact_id itself belongs
  // to that workspace, so this guards against cross-workspace linking.
  const { data: validContacts, error: contactsError } = await ctx.supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", ctx.workspace.id)
    .in("id", ids);
  if (contactsError) return { error: contactsError.message };

  const validIds = (validContacts ?? []).map((c) => c.id);
  if (validIds.length === 0) return {};

  const { error: linkError } = await ctx.supabase.from("contact_tags").upsert(
    validIds.map((contactId) => ({
      workspace_id: ctx.workspace.id,
      contact_id: contactId,
      tag_id: tagRow.id,
    })),
    { onConflict: "contact_id,tag_id", ignoreDuplicates: true }
  );
  if (linkError) return { error: linkError.message };

  revalidatePath("/dashboard/contacts");
  return {};
}
