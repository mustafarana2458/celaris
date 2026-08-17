"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { AiUsageChartView, PipelineView, UserPreferenceActionResult } from "@/lib/types";

export async function setPipelineView(view: PipelineView): Promise<UserPreferenceActionResult> {
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

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      workspace_id: workspace.id,
      default_pipeline_view: view,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) return { error: error.message };
  return {};
}

export async function setSaveAiHistory(save: boolean): Promise<UserPreferenceActionResult> {
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

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      workspace_id: workspace.id,
      save_ai_history: save,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) return { error: error.message };
  return {};
}

// Controls whether the sidebar's AI Usage widget (progress bar + mini chart)
// renders at all -- OFF hides it immediately, same "transparency by default"
// framing as save_ai_history. Read by app/dashboard/layout.tsx server-side
// on every dashboard page load (drives the sidebar), and by the settings AI
// Usage tab's own toggle.
export async function setShowAiUsageWidget(show: boolean): Promise<UserPreferenceActionResult> {
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

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      workspace_id: workspace.id,
      show_ai_usage_widget: show,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) return { error: error.message };
  return {};
}

// Daily vs monthly view for the AI Usage chart -- shared between the sidebar
// widget and the settings tab's bigger chart, so switching in either place
// stays in sync on the next load.
export async function setAiUsageChartView(view: AiUsageChartView): Promise<UserPreferenceActionResult> {
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

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      workspace_id: workspace.id,
      ai_usage_chart_view: view,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) return { error: error.message };
  return {};
}
