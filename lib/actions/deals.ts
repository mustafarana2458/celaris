"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { DealStage } from "@/lib/types";

export type DealActionResult = { error?: string };

const VALID_STAGES: DealStage[] = ["new", "qualified", "proposal", "won", "lost"];

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

function dealFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const contactId = String(formData.get("contact_id") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "new").trim();
  const expectedClose = String(formData.get("expected_close") ?? "").trim();

  const value = valueRaw === "" ? null : Number(valueRaw);
  const stage = (VALID_STAGES.includes(stageRaw as DealStage) ? stageRaw : "new") as DealStage;

  return {
    title,
    contact_id: contactId || null,
    value: value !== null && !Number.isNaN(value) ? value : null,
    stage,
    expected_close: expectedClose || null,
  };
}

export async function createDeal(formData: FormData): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = dealFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }

  const { error } = await ctx.supabase.from("deals").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function updateDeal(
  id: string,
  formData: FormData
): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = dealFields(formData);
  if (!fields.title) {
    return { error: "Title is required." };
  }

  const { error } = await ctx.supabase
    .from("deals")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function updateDealStage(
  id: string,
  stage: DealStage
): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  if (!VALID_STAGES.includes(stage)) {
    return { error: "Invalid stage." };
  }

  const { error } = await ctx.supabase
    .from("deals")
    .update({ stage })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}

export async function deleteDeal(id: string): Promise<DealActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return {};
}
