"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type PipelineActionResult = {
  error?: string;
  pipeline?: { id: string; name: string; is_default: boolean };
};

async function requireWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." } as const;
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace) {
    return { error: "No workspace found for this account." } as const;
  }

  return { supabase, workspace } as const;
}

export async function createPipeline(formData: FormData): Promise<PipelineActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Pipeline name is required." };
  }

  const { data, error } = await ctx.supabase
    .from("pipelines")
    .insert({ name, workspace_id: ctx.workspace.id, is_default: false })
    .select("id, name, is_default")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/deals");
  return { pipeline: data };
}
