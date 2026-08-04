"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callGroq } from "@/lib/groq";
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
  const companyId = String(formData.get("company_id") ?? "").trim();
  const pipelineId = String(formData.get("pipeline_id") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();
  const winProbabilityRaw = String(formData.get("win_probability") ?? "").trim();
  const stageRaw = String(formData.get("stage") ?? "new").trim();
  const expectedClose = String(formData.get("expected_close") ?? "").trim();

  const value = valueRaw === "" ? null : Number(valueRaw);
  const winProbabilityNum = winProbabilityRaw === "" ? null : Number(winProbabilityRaw);
  const winProbability =
    winProbabilityNum !== null && !Number.isNaN(winProbabilityNum)
      ? Math.max(0, Math.min(100, Math.round(winProbabilityNum)))
      : null;
  const stage = (VALID_STAGES.includes(stageRaw as DealStage) ? stageRaw : "new") as DealStage;

  return {
    title,
    contact_id: contactId || null,
    company_id: companyId || null,
    pipeline_id: pipelineId || null,
    owner_id: ownerId || null,
    value: value !== null && !Number.isNaN(value) ? value : null,
    win_probability: winProbability,
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

  if (error) {
    console.error("[createDeal] insert failed:", error);
    return { error: error.message };
  }

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

  if (error) {
    console.error("[updateDeal] update failed:", error);
    return { error: error.message };
  }

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

export type ScoreDealResult = { score?: number; reason?: string; error?: string };

type ScoringDeal = {
  title: string;
  value: number | null;
  stage: DealStage;
  expected_close: string | null;
  contacts: { name: string; company: string | null; type: string } | null;
};

function buildScoringPrompt(deal: ScoringDeal) {
  const valueLine = deal.value != null ? `Deal value: $${deal.value}.` : "Deal value is not set.";
  const closeLine = deal.expected_close
    ? `Expected close date: ${deal.expected_close}.`
    : "No expected close date is set.";
  const contactLine = deal.contacts
    ? `Linked contact: ${deal.contacts.name}${deal.contacts.company ? ` at ${deal.contacts.company}` : ""}, a ${deal.contacts.type}.`
    : "No contact is linked to this deal.";

  return (
    `You are a sales assistant scoring a deal's likelihood of closing successfully, ` +
    `on a scale from 0 (very unlikely) to 100 (very likely), based only on the information below.\n\n` +
    `Deal title: ${deal.title}\n` +
    `Stage: ${deal.stage}\n` +
    `${valueLine}\n` +
    `${closeLine}\n` +
    `${contactLine}\n\n` +
    `Respond in EXACTLY this format and nothing else:\n` +
    `SCORE: <a number from 0 to 100>\n` +
    `REASON: <one short sentence explaining the score>`
  );
}

function parseScoreResponse(text: string): { score: number; reason: string } | null {
  const scoreMatch = text.match(/SCORE:\s*(\d{1,3})/i);
  if (!scoreMatch) return null;

  const score = Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10)));
  const reasonMatch = text.match(/REASON:\s*(.+)/i);
  const reason = reasonMatch ? reasonMatch[1].trim() : "";

  return { score, reason };
}

export async function scoreDeal(id: string): Promise<ScoreDealResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { data: deal, error: dealError } = await ctx.supabase
    .from("deals")
    .select("title, value, stage, expected_close, contacts(name, company, type)")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle<ScoringDeal>();

  if (dealError || !deal) {
    return { error: "Deal not found." };
  }

  const result = await callGroq(buildScoringPrompt(deal), { temperature: 0 });
  if (result.error) {
    return { error: result.error };
  }

  const parsed = parseScoreResponse(result.text ?? "");
  if (!parsed) {
    return { error: "Could not parse a score from the AI response. Please try again." };
  }

  const { error: updateError } = await ctx.supabase
    .from("deals")
    .update({ ai_score: parsed.score })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/deals");
  return { score: parsed.score, reason: parsed.reason };
}
