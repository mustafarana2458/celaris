"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { resolveSegmentContactIds, type Segment, type SegmentQueryLogic } from "@/lib/segments";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type Contact } from "@/lib/types";

type SegmentActionResult = { error?: string; segment?: Segment };

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

  return { supabase, workspace, userId: user.id } as const;
}

function validateQueryLogic(queryLogic: SegmentQueryLogic): string | null {
  if (!queryLogic.rules || queryLogic.rules.length === 0) {
    return "Add at least one condition.";
  }
  for (const rule of queryLogic.rules) {
    if (!rule.field || !rule.operator || !rule.value.trim()) {
      return "Every condition needs a field, operator, and value.";
    }
  }
  return null;
}

export async function listSegmentsWithCounts(): Promise<
  { segments: (Segment & { matchCount: number })[] } | { error: string }
> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return { error: ctx.error ?? "Something went wrong." };

  const { data, error } = await ctx.supabase
    .from("segments")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const segments = (data as Segment[]) ?? [];
  const withCounts = await Promise.all(
    segments.map(async (segment) => {
      try {
        const ids = await resolveSegmentContactIds(ctx.supabase, ctx.workspace.id, segment.query_logic);
        return { ...segment, matchCount: ids.length };
      } catch {
        return { ...segment, matchCount: 0 };
      }
    })
  );

  return { segments: withCounts };
}

export async function createSegment(
  name: string,
  description: string,
  queryLogic: SegmentQueryLogic
): Promise<SegmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!name.trim()) return { error: "Segment name is required." };
  const validationError = validateQueryLogic(queryLogic);
  if (validationError) return { error: validationError };

  const { data, error } = await ctx.supabase
    .from("segments")
    .insert({
      workspace_id: ctx.workspace.id,
      name: name.trim(),
      description: description.trim() || null,
      query_logic: queryLogic,
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts/segments");
  return { segment: data as Segment };
}

export async function updateSegment(
  id: string,
  name: string,
  description: string,
  queryLogic: SegmentQueryLogic
): Promise<SegmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!name.trim()) return { error: "Segment name is required." };
  const validationError = validateQueryLogic(queryLogic);
  if (validationError) return { error: validationError };

  const { data, error } = await ctx.supabase
    .from("segments")
    .update({
      name: name.trim(),
      description: description.trim() || null,
      query_logic: queryLogic,
    })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts/segments");
  return { segment: data as Segment };
}

export async function deleteSegment(id: string): Promise<SegmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("segments")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/contacts/segments");
  return {};
}

export async function previewSegmentContacts(
  queryLogic: SegmentQueryLogic,
  options: { search?: string; page?: number; pageSize?: number } = {}
): Promise<{ contacts: Contact[]; total: number } | { error: string }> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return { error: ctx.error ?? "Something went wrong." };

  let ids: string[];
  try {
    ids = await resolveSegmentContactIds(ctx.supabase, ctx.workspace.id, queryLogic);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to evaluate segment." };
  }

  if (ids.length === 0) return { contacts: [], total: 0 };

  const { search = "", page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

  let q = ctx.supabase
    .from("contacts")
    .select("*, companies(id, name), contact_tags(tags(id, name))", { count: "exact" })
    .eq("workspace_id", ctx.workspace.id)
    .in("id", ids);

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

  const { data, count, error } = await q.order("created_at", { ascending: false }).range(from, to);

  if (error) return { error: error.message };

  return { contacts: (data as Contact[]) ?? [], total: count ?? 0 };
}

export async function exportSegmentContacts(
  queryLogic: SegmentQueryLogic
): Promise<{ contacts: Contact[] } | { error: string }> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return { error: ctx.error ?? "Something went wrong." };

  let ids: string[];
  try {
    ids = await resolveSegmentContactIds(ctx.supabase, ctx.workspace.id, queryLogic);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to evaluate segment." };
  }

  if (ids.length === 0) return { contacts: [] };

  const { data, error } = await ctx.supabase
    .from("contacts")
    .select("*, companies(id, name), contact_tags(tags(id, name))")
    .eq("workspace_id", ctx.workspace.id)
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  return { contacts: (data as Contact[]) ?? [] };
}
