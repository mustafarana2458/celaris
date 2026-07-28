"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type FollowUpResult = { message?: string; error?: string };

const OLLAMA_MODEL = "llama3.2:3b";
const TIMEOUT_MS = 60_000;

type PromptContact = {
  name: string;
  company: string | null;
  type: string;
  tags: string[] | null;
};

function buildPrompt(contact: PromptContact) {
  const companyPart = contact.company ? ` from ${contact.company}` : "";
  const tags = (contact.tags ?? []).filter((t) => t && t.trim());
  const tagsPart =
    tags.length > 0 ? ` A bit about them: ${tags.join(", ")}.` : "";

  return (
    `You are a friendly business assistant. Write a short, warm, professional follow-up message ` +
    `(2-3 sentences) to a contact named ${contact.name}${companyPart}, who is a ${contact.type}. ` +
    `The goal is to check in and maintain the relationship.${tagsPart} ` +
    `Only output the message text, nothing else.`
  );
}

export async function generateFollowUpMessage(contactId: string): Promise<FollowUpResult> {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) {
    return { error: "AI service is not configured (missing OLLAMA_URL)." };
  }

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
    .select("name, company, type, tags")
    .eq("id", contactId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<PromptContact>();

  if (contactError || !contact) {
    return { error: "Contact not found." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(contact),
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { error: `AI service returned an error (${response.status}).` };
    }

    const data = (await response.json()) as { response?: unknown };
    const message = typeof data.response === "string" ? data.response.trim() : "";

    if (!message) {
      return { error: "The AI didn't return a message. Please try again." };
    }

    return { message };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "The AI took too long to respond. Please try again." };
    }
    return { error: "Could not reach the AI service. Please try again later." };
  } finally {
    clearTimeout(timeout);
  }
}
