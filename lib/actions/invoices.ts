"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";
import type { RecurringFrequency, InvoiceStatus } from "@/lib/types";

export type InvoiceActionResult = { error?: string };

const VALID_STATUSES: InvoiceStatus[] = ["unpaid", "paid", "overdue"];
const VALID_FREQUENCIES: RecurringFrequency[] = ["monthly", "quarterly", "yearly"];

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

function invoiceFields(formData: FormData, lineItems: LineItemInput[]) {
  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim();
  const contactId = String(formData.get("contact_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "unpaid").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();

  const taxPercentRaw = String(formData.get("tax_percent") ?? "").trim();
  const discountRaw = String(formData.get("discount") ?? "").trim();
  const taxPercentParsed = taxPercentRaw === "" ? 0 : Number(taxPercentRaw);
  const discountParsed = discountRaw === "" ? 0 : Number(discountRaw);
  const taxPercent = Number.isFinite(taxPercentParsed) ? Math.max(0, taxPercentParsed) : 0;
  const discount = Number.isFinite(discountParsed) ? Math.max(0, discountParsed) : 0;

  const isRecurring = formData.get("is_recurring") === "on";
  const recurringFrequencyRaw = String(formData.get("recurring_frequency") ?? "").trim();
  const recurringFrequency = VALID_FREQUENCIES.includes(recurringFrequencyRaw as RecurringFrequency)
    ? (recurringFrequencyRaw as RecurringFrequency)
    : null;
  const nextIssueDate = String(formData.get("next_issue_date") ?? "").trim();

  const status = (
    VALID_STATUSES.includes(statusRaw as InvoiceStatus) ? statusRaw : "unpaid"
  ) as InvoiceStatus;

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * (taxPercent / 100);
  const total = taxableAmount + tax;

  return {
    invoice_number: invoiceNumber,
    contact_id: contactId || null,
    project_id: projectId || null,
    amount: subtotal,
    tax,
    tax_percent: taxPercent,
    discount,
    total,
    status,
    due_date: dueDate || null,
    is_recurring: isRecurring,
    recurring_frequency: isRecurring ? recurringFrequency : null,
    next_issue_date: isRecurring && nextIssueDate ? nextIssueDate : null,
  };
}

async function replaceLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  workspaceId: string,
  lineItems: LineItemInput[]
) {
  const { error: deleteError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId)
    .eq("workspace_id", workspaceId);
  if (deleteError) return deleteError;

  if (lineItems.length === 0) return null;

  const { error: insertError } = await supabase.from("invoice_items").insert(
    lineItems.map((item, index) => ({
      invoice_id: invoiceId,
      workspace_id: workspaceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      position: index,
    }))
  );
  return insertError;
}

export async function createInvoice(formData: FormData): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "all_invoices");
  if (permError) return permError;

  const lineItems = parseLineItems(formData);
  const fields = invoiceFields(formData, lineItems);
  if (!fields.invoice_number) {
    return { error: "Invoice number is required." };
  }

  const { data: inserted, error } = await ctx.supabase
    .from("invoices")
    .insert({
      ...fields,
      workspace_id: ctx.workspace.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const lineItemsError = await replaceLineItems(
    ctx.supabase,
    inserted.id,
    ctx.workspace.id,
    lineItems
  );
  if (lineItemsError) return { error: lineItemsError.message };

  revalidatePath("/dashboard/invoices");
  return {};
}

export async function updateInvoice(
  id: string,
  formData: FormData
): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "all_invoices");
  if (permError) return permError;

  const lineItems = parseLineItems(formData);
  const fields = invoiceFields(formData, lineItems);
  if (!fields.invoice_number) {
    return { error: "Invoice number is required." };
  }

  const { error } = await ctx.supabase
    .from("invoices")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  const lineItemsError = await replaceLineItems(ctx.supabase, id, ctx.workspace.id, lineItems);
  if (lineItemsError) return { error: lineItemsError.message };

  revalidatePath("/dashboard/invoices");
  return {};
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "all_invoices");
  if (permError) return permError;

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }

  const { error } = await ctx.supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  return {};
}

export async function deleteInvoice(id: string): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireFullAccess(ctx.workspace, "invoices", "all_invoices");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  return {};
}
