"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { InvoiceStatus } from "@/lib/types";

export type InvoiceActionResult = { error?: string };

const VALID_STATUSES: InvoiceStatus[] = ["unpaid", "paid", "overdue"];

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

function invoiceFields(formData: FormData) {
  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim();
  const contactId = String(formData.get("contact_id") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const taxRaw = String(formData.get("tax") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "unpaid").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();

  const amountParsed = amountRaw === "" ? 0 : Number(amountRaw);
  const taxParsed = taxRaw === "" ? 0 : Number(taxRaw);
  const amount = Number.isNaN(amountParsed) ? 0 : amountParsed;
  const tax = Number.isNaN(taxParsed) ? 0 : taxParsed;
  const status = (
    VALID_STATUSES.includes(statusRaw as InvoiceStatus) ? statusRaw : "unpaid"
  ) as InvoiceStatus;

  return {
    invoice_number: invoiceNumber,
    contact_id: contactId || null,
    amount,
    tax,
    total: amount + tax,
    status,
    due_date: dueDate || null,
  };
}

export async function createInvoice(formData: FormData): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = invoiceFields(formData);
  if (!fields.invoice_number) {
    return { error: "Invoice number is required." };
  }

  const { error } = await ctx.supabase.from("invoices").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  return {};
}

export async function updateInvoice(
  id: string,
  formData: FormData
): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = invoiceFields(formData);
  if (!fields.invoice_number) {
    return { error: "Invoice number is required." };
  }

  const { error } = await ctx.supabase
    .from("invoices")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  return {};
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<InvoiceActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

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

  const { error } = await ctx.supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  return {};
}
