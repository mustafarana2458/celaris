"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { callOllama } from "@/lib/ollama";
import { buildWorkspaceSummary, formatWorkspaceSummary } from "@/lib/workspaceSummary";

export type AssistantResult = { answer?: string; error?: string };

const MAX_QUESTION_LENGTH = 500;

function buildPrompt(summaryText: string, question: string) {
  return (
    `You are a business assistant answering questions about the user's CRM data. ` +
    `Use ONLY the data below to answer. Do not invent numbers, names, or details that are not present. ` +
    `The data below contains totals and counts only, not individual record names — if the question asks ` +
    `for something the data doesn't cover (like specific names), say the data doesn't include that detail.\n\n` +
    `Business data summary:\n${summaryText}\n\n` +
    `Question: ${question}\n\n` +
    `Answer concisely in 1-3 sentences, using only the data above.`
  );
}

export async function askAssistant(question: string): Promise<AssistantResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { error: "Please enter a question." };
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return { error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.` };
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

  const summary = await buildWorkspaceSummary(supabase, workspace.id);
  const prompt = buildPrompt(formatWorkspaceSummary(summary), trimmed);

  const result = await callOllama(prompt);
  if (result.error) {
    return { error: result.error };
  }

  return { answer: result.text };
}
