"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callOllama } from "@/lib/ollama";

export type FollowUpResult = { message?: string; error?: string };

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

  const result = await callOllama(buildPrompt(contact));
  if (result.error) {
    return { error: result.error };
  }

  return { message: result.text };
}
