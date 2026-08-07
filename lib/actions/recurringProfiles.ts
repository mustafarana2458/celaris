"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { RecurringProfileFrequency, RecurringProfileStatus } from "@/lib/types";

export type RecurringProfileActionResult = { error?: string };

const VALID_FREQUENCIES: RecurringProfileFrequency[] = ["weekly", "monthly", "quarterly", "annually"];
const VALID_STATUSES: RecurringProfileStatus[] = ["active", "paused"];

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

type LineItemInput = { description: string; quantity: number; unit_price: number };

function parseLineItems(formData: FormData): LineItemInput[] {
  const raw = String(formData.get("line_items_json") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const description = String((item as { description?: unknown }).description ?? "").trim();
      const quantity = Number((item as { quantity?: unknown }).quantity);
      const unitPrice = Number((item as { unit_price?: unknown }).unit_price);
      if (!description) return null;
      return {
        description,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit_price: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      };
    })
    .filter((item): item is LineItemInput => item !== null);
}

function profileFields(formData: FormData, lineItems: LineItemInput[]) {
  const profileName = String(formData.get("profile_name") ?? "").trim();
  const contactId = String(formData.get("contact_id") ?? "").trim();
  const frequencyRaw = String(formData.get("frequency") ?? "monthly").trim();
  const frequency = (
    VALID_FREQUENCIES.includes(frequencyRaw as RecurringProfileFrequency) ? frequencyRaw : "monthly"
  ) as RecurringProfileFrequency;

  const taxPercentRaw = String(formData.get("tax_percent") ?? "").trim();
  const discountRaw = String(formData.get("discount") ?? "").trim();
  const taxPercentParsed = taxPercentRaw === "" ? 0 : Number(taxPercentRaw);
  const discountParsed = discountRaw === "" ? 0 : Number(discountRaw);
  const taxPercent = Number.isFinite(taxPercentParsed) ? Math.max(0, taxPercentParsed) : 0;
  const discount = Number.isFinite(discountParsed) ? Math.max(0, discountParsed) : 0;

  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const autoSend = formData.get("auto_send") === "on";

  return {
    profile_name: profileName,
    contact_id: contactId || null,
    line_items: lineItems,
    tax_percent: taxPercent,
    discount,
    frequency,
    start_date: startDate,
    end_date: endDate || null,
    auto_send: autoSend,
  };
}

export async function createRecurringProfile(formData: FormData): Promise<RecurringProfileActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const lineItems = parseLineItems(formData);
  const fields = profileFields(formData, lineItems);

  if (!fields.profile_name) {
    return { error: "Profile name is required." };
  }
  if (lineItems.length === 0) {
    return { error: "Add at least one line item with a description." };
  }
  if (!fields.start_date) {
    return { error: "Start date is required." };
  }

  const { error } = await ctx.supabase.from("recurring_profiles").insert({
    ...fields,
    next_issue_date: fields.start_date,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/recurring");
  return {};
}

export async function updateRecurringProfile(
  id: string,
  formData: FormData
): Promise<RecurringProfileActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const lineItems = parseLineItems(formData);
  const fields = profileFields(formData, lineItems);

  if (!fields.profile_name) {
    return { error: "Profile name is required." };
  }
  if (lineItems.length === 0) {
    return { error: "Add at least one line item with a description." };
  }
  if (!fields.start_date) {
    return { error: "Start date is required." };
  }

  const { error } = await ctx.supabase
    .from("recurring_profiles")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/recurring");
  return {};
}

export async function setRecurringProfileStatus(
  id: string,
  status: RecurringProfileStatus
): Promise<RecurringProfileActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }

  const { error } = await ctx.supabase
    .from("recurring_profiles")
    .update({ status })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/recurring");
  return {};
}

export async function deleteRecurringProfile(id: string): Promise<RecurringProfileActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("recurring_profiles")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices/recurring");
  return {};
}
