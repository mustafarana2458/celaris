"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." } as const;
  }

  return { supabase, user } as const;
}

export async function switchWorkspace(workspaceId: string): Promise<WorkspaceActionResult> {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx;
  const { supabase, user } = ctx;

  // Never trust the client-supplied id blindly -- confirm the user actually
  // has a membership on this workspace before switching to it.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return { error: "You don't have access to that workspace." };
  }

  const { error } = await supabase
    .from("users")
    .update({ last_active_workspace_id: workspaceId })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function createWorkspace(formData: FormData): Promise<WorkspaceActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Workspace name is required." };
  }

  const ctx = await requireUser();
  if ("error" in ctx) return ctx;
  const { supabase, user } = ctx;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name, owner_id: user.id, plan: "free" })
    .select("id")
    .single();

  if (workspaceError) return { error: workspaceError.message };

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) return { error: memberError.message };

  const { error: updateError } = await supabase
    .from("users")
    .update({ last_active_workspace_id: workspace.id })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard", "layout");
  return {};
}
