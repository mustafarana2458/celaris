"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { hasModuleAccess } from "@/lib/permissions";
import { callGroq } from "@/lib/groq";
import { buildWorkspaceSummary, formatWorkspaceSummary } from "@/lib/workspaceSummary";

export type InsightsResult = { insights?: string; error?: string };

function buildInsightsPrompt(summaryText: string) {
  return (
    `You are a business advisor reviewing a small business's CRM data. ` +
    `Analyze the summary below and give 3 to 5 short, specific, actionable insights or recommendations. ` +
    `Reference the actual numbers from the data in each insight — be concrete, not generic. ` +
    `Base every insight ONLY on the data below; do not invent numbers or details that aren't present, ` +
    `and double-check each number against the summary before writing it — do not mix up figures ` +
    `between different categories (e.g. don't confuse an overdue task count with an invoice count).\n\n` +
    `Business data summary:\n${summaryText}\n\n` +
    `Output ONLY a simple bullet list, one insight per line, each starting with "- ". ` +
    `Do not include an introduction, a summary, headings, or any text other than the bullet list.`
  );
}

export async function generateInsights(): Promise<InsightsResult> {
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

  // Same gates as the dashboard's KPI widgets -- a member who can't see
  // revenue/deals/contacts figures on the dashboard shouldn't see them
  // surface through the AI's generated text either.
  const visibility = {
    contacts: hasModuleAccess(workspace.role, workspace.permissions, "dashboard", "contacts_kpis"),
    deals: hasModuleAccess(workspace.role, workspace.permissions, "dashboard", "deals_kpis"),
    revenue: hasModuleAccess(workspace.role, workspace.permissions, "dashboard", "revenue_kpis"),
  };

  const summary = await buildWorkspaceSummary(supabase, workspace.id, visibility);
  const prompt = buildInsightsPrompt(formatWorkspaceSummary(summary));

  const result = await callGroq(prompt);
  if (result.error) {
    return { error: result.error };
  }

  return { insights: result.text };
}
