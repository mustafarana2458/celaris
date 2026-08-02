"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callOllama } from "@/lib/ollama";
import type { FollowUpDraftResult, FollowUpOutputType, FollowUpTone } from "@/lib/types";

type PromptContact = {
  name: string;
  company: string | null;
  type: string;
  notes: string | null;
  companies: { name: string } | null;
  contact_tags: { tags: { name: string } | null }[] | null;
};

const TONE_GUIDANCE: Record<FollowUpTone, string> = {
  friendly: "upbeat, casual, and approachable",
  professional: "polished, formal, and businesslike",
  direct: "brief, blunt, and action-oriented, no small talk",
  warm: "caring, personable, and relationship-focused",
};

function resolveTagNames(contact: PromptContact): string[] {
  return (contact.contact_tags ?? [])
    .map((ct) => ct.tags?.name)
    .filter((name): name is string => !!name);
}

function buildPrompt(
  contact: PromptContact,
  outputType: FollowUpOutputType,
  tone: FollowUpTone
) {
  const companyName = contact.companies?.name ?? contact.company;
  const companyPart = companyName ? ` from ${companyName}` : "";
  const relationship = contact.type === "customer" ? "Customer" : "Lead";
  const tags = resolveTagNames(contact);
  const tagsPart = tags.length > 0 ? `\nTags: ${tags.join(", ")}` : "";
  const notesPart = contact.notes?.trim()
    ? `\nNotes: ${contact.notes.trim()}`
    : "\nNotes: none on file — keep this a generic, friendly check-in.";

  const contextBlock =
    `Contact: ${contact.name}${companyPart}\nRelationship: ${relationship}${tagsPart}${notesPart}`;

  const toneInstruction = TONE_GUIDANCE[tone];

  if (outputType === "email") {
    return (
      `You are a business assistant drafting a follow-up email. Use a ${toneInstruction} tone.\n\n` +
      `${contextBlock}\n\n` +
      `Write a short follow-up email (2-4 sentences in the body) to this contact based on the context above. ` +
      `Respond with ONLY valid JSON in exactly this shape, no markdown, no extra text: ` +
      `{"subject": "short subject line", "body": "the email body"}`
    );
  }

  return (
    `You are a business assistant drafting a short follow-up message (like a text/WhatsApp message). ` +
    `Use a ${toneInstruction} tone.\n\n` +
    `${contextBlock}\n\n` +
    `Write a very short follow-up message (1-3 sentences, no greeting formality, no subject line) based on the context above. ` +
    `Respond with ONLY valid JSON in exactly this shape, no markdown, no extra text: ` +
    `{"body": "the message text"}`
  );
}

function parseDraft(text: string, outputType: FollowUpOutputType): FollowUpDraftResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return outputType === "message" ? { body: text.trim() } : { error: "Could not parse the AI's response. Please try again." };
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { error: "Could not parse the AI's response. Please try again." };
    }
  }

  if (typeof parsed !== "object" || parsed === null || !("body" in parsed)) {
    return { error: "The AI's response was missing a message body. Please try again." };
  }

  const body = String((parsed as { body: unknown }).body ?? "").trim();
  if (!body) {
    return { error: "The AI's response was missing a message body. Please try again." };
  }

  if (outputType === "email") {
    const subject =
      "subject" in parsed ? String((parsed as { subject: unknown }).subject ?? "").trim() : "";
    return { subject: subject || undefined, body };
  }

  return { body };
}

export async function generateFollowUpDraft(
  contactId: string,
  outputType: FollowUpOutputType,
  tone: FollowUpTone
): Promise<FollowUpDraftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return { error: "No workspace found for this account." };
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("name, company, type, notes, companies(name), contact_tags(tags(name))")
    .eq("id", contactId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<PromptContact>();

  if (contactError || !contact) {
    return { error: "Contact not found." };
  }

  const result = await callOllama(buildPrompt(contact, outputType, tone), undefined, "json");
  if (result.error || !result.text) {
    return { error: result.error ?? "The AI didn't return a response. Please try again." };
  }

  return parseDraft(result.text, outputType);
}
