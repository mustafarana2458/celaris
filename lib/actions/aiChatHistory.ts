"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type AiChatHistoryActionResult = { error?: string };

export async function saveAiChatMessage(
  role: "user" | "assistant",
  content: string
): Promise<AiChatHistoryActionResult> {
  const trimmed = content.trim();
  if (!trimmed) return {};

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

  const { error } = await supabase.from("ai_chat_history").insert({
    user_id: user.id,
    workspace_id: workspace.id,
    role,
    content: trimmed,
  });

  if (error) return { error: error.message };
  return {};
}
