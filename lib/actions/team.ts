"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requireFullAccess } from "@/lib/permissions";
import { requirePlanAllowsModule } from "@/lib/planLimits";

export type TeamActionResult = { error?: string };

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

// Ghost profiles (this table) have no role concept in the UI -- the DB
// column defaults to 'member' and is left alone here, both on insert (just
// omitted so the default applies) and on edit (never overwritten).
function teamMemberFields(formData: FormData) {
  const memberName = String(formData.get("member_name") ?? "").trim();
  const memberEmail = String(formData.get("member_email") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();

  return {
    member_name: memberName,
    member_email: memberEmail || null,
    job_title: jobTitle || null,
    phone_number: phoneNumber || null,
  };
}

export async function createTeamMember(formData: FormData): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "team", "team_directory");
  if (permError) return permError;

  const fields = teamMemberFields(formData);
  if (!fields.member_name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase.from("team_members").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/directory");
  return {};
}

export async function updateTeamMember(
  id: string,
  formData: FormData
): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "team", "team_directory");
  if (permError) return permError;

  const fields = teamMemberFields(formData);
  if (!fields.member_name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase
    .from("team_members")
    .update(fields)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/directory");
  return {};
}

export async function deleteTeamMember(id: string): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

  const permError = requireFullAccess(ctx.workspace, "team", "team_directory");
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/directory");
  return {};
}
