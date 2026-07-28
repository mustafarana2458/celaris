"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { TeamRole } from "@/lib/types";

export type TeamActionResult = { error?: string };

const VALID_ROLES: TeamRole[] = ["owner", "admin", "member"];

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

function teamMemberFields(formData: FormData) {
  const memberName = String(formData.get("member_name") ?? "").trim();
  const memberEmail = String(formData.get("member_email") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "member").trim();
  const role = (
    VALID_ROLES.includes(roleRaw as TeamRole) ? roleRaw : "member"
  ) as TeamRole;

  return {
    member_name: memberName,
    member_email: memberEmail || null,
    role,
  };
}

export async function createTeamMember(formData: FormData): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const fields = teamMemberFields(formData);
  if (!fields.member_name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase.from("team_members").insert({
    ...fields,
    workspace_id: ctx.workspace.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function updateTeamMember(
  id: string,
  formData: FormData
): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

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

  revalidatePath("/dashboard/team");
  return {};
}

export async function deleteTeamMember(id: string): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}
