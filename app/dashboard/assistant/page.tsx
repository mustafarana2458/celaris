import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { AssistantPageClient, type ChatMessage } from "@/components/assistant/AssistantPageClient";

type AiChatHistoryRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default async function AssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);

  let saveHistory = true;
  let initialMessages: ChatMessage[] = [];

  if (workspace) {
    const { data: preference } = await supabase
      .from("user_preferences")
      .select("save_ai_history")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace.id)
      .maybeSingle<{ save_ai_history: boolean | null }>();

    saveHistory = preference?.save_ai_history ?? true;

    if (saveHistory) {
      const { data: history } = await supabase
        .from("ai_chat_history")
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true });

      initialMessages = ((history as AiChatHistoryRow[] | null) ?? []).map((row) => ({
        id: row.id,
        role: row.role,
        kind: "answer" as const,
        content: row.content,
      }));
    }
  }

  return <AssistantPageClient initialMessages={initialMessages} initialSaveHistory={saveHistory} />;
}
