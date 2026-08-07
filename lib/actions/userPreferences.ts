"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { PipelineView, UserPreferenceActionResult } from "@/lib/types";

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
