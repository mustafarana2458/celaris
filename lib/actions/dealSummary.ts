"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callGroq } from "@/lib/groq";
import type { DealAiSummary, DealStage, DealSummaryActionResult } from "@/lib/types";

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

type PromptDeal = {
  title: string;
  value: number | null;
  stage: DealStage;
  expected_close: string | null;
  contacts: { name: string; company: string | null; notes: string | null; companies: { name: string } | null } | null;
};

function buildSummaryPrompt(deal: PromptDeal) {
  const companyName = deal.contacts?.companies?.name ?? deal.contacts?.company;
  const valueLine = deal.value != null ? `Deal value: $${deal.value}.` : "Deal value is not set.";
  const closeLine = deal.expected_close
    ? `Expected close date: ${deal.expected_close}.`
    : "No expected close date is set.";
  const contactLine = deal.contacts
    ? `Linked contact: ${deal.contacts.name}${companyName ? ` at ${companyName}` : ""}.`
    : "No contact is linked to this deal.";
  const notesLine = deal.contacts?.notes?.trim()
    ? `Contact notes: ${deal.contacts.notes.trim()}`
    : "No notes on file for this contact.";
  const firstName = deal.contacts?.name.split(/\s+/)[0] || deal.contacts?.name;

  return (
    `You are a sales assistant summarizing a deal for a busy rep skimming their pipeline.\n\n` +
    `Deal title: ${deal.title}\n` +
    `Stage: ${deal.stage}\n` +
    `${valueLine}\n` +
    `${closeLine}\n` +
    `${contactLine}\n` +
    `${notesLine}\n\n` +
    `Respond with ONLY valid JSON in exactly this shape, no markdown, no extra text:\n` +
    `{"summary": "2-3 sentence summary of this deal's current state and likelihood of closing", ` +
    `"next_steps": "1-3 sentence recommended next action to move this deal toward closing", ` +
    `"follow_up_email": {"subject": "short subject line", "body": "a short 2-4 sentence follow-up email body` +
    `${deal.contacts ? `, greeting the contact by first name only (\\"Hi ${firstName},\\")` : ", written generically since no contact is linked"}` +
    `"}}`
  );
}

function parseSummaryResponse(text: string): DealAiSummary | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const summary = String(obj.summary ?? "").trim();
  const nextSteps = String(obj.next_steps ?? "").trim();
  const followUp = obj.follow_up_email as Record<string, unknown> | undefined;
  const subject = String(followUp?.subject ?? "").trim();
  const body = String(followUp?.body ?? "").trim();

  if (!summary || !nextSteps || !body) return null;

  return { summary, next_steps: nextSteps, follow_up_email: { subject, body } };
}

export async function generateDealSummary(dealId: string): Promise<DealSummaryActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { data: deal, error: dealError } = await ctx.supabase
    .from("deals")
    .select("title, value, stage, expected_close, contacts(name, company, notes, companies(name))")
    .eq("id", dealId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle<PromptDeal>();

  if (dealError || !deal) {
    return { error: "Deal not found." };
  }

  const result = await callGroq(buildSummaryPrompt(deal), undefined, "json");
  if (result.error || !result.text) {
    return { error: result.error ?? "The AI didn't return a response. Please try again." };
  }

  const parsed = parseSummaryResponse(result.text);
  if (!parsed) {
    return { error: "Could not parse the AI's response. Please try again." };
  }

  const generatedAt = new Date().toISOString();
  const { error: updateError } = await ctx.supabase
    .from("deals")
    .update({ ai_summary: parsed, ai_summary_generated_at: generatedAt })
    .eq("id", dealId)
    .eq("workspace_id", ctx.workspace.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/deals");
  return { summary: parsed, generated_at: generatedAt };
}
