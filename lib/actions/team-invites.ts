"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { InvitationRole } from "@/lib/types";

export type TeamInviteActionResult = { error?: string };
export type AcceptInvitationResult = { error?: string; workspaceId?: string };

const VALID_INVITE_ROLES: InvitationRole[] = ["admin", "member"];
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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

  return { supabase, workspace, userId: user.id } as const;
}

function requireOwnerOrAdmin(role: string): TeamInviteActionResult | null {
  if (role !== "owner" && role !== "admin") {
    return { error: "Only owners and admins can manage the team." };
  }
  return null;
}

export async function createInvitation(formData: FormData): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "member").trim();
  const role = (
    VALID_INVITE_ROLES.includes(roleRaw as InvitationRole) ? roleRaw : "member"
  ) as InvitationRole;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const { error } = await ctx.supabase.from("invitations").insert({
    workspace_id: ctx.workspace.id,
    email,
    role,
    invited_by: ctx.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function resendInvitation(id: string): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("invitations")
    .update({ expires_at: new Date(Date.now() + INVITE_EXPIRY_MS).toISOString() })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function cancelInvitation(id: string): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function updateMemberRole(
  targetUserId: string,
  newRole: string
): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase.rpc("update_member_role", {
    p_workspace_id: ctx.workspace.id,
    p_target_user_id: targetUserId,
    p_new_role: newRole,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function removeMember(targetUserId: string): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase.rpc("remove_workspace_member", {
    p_workspace_id: ctx.workspace.id,
    p_target_user_id: targetUserId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to accept an invitation." };
  }

  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return { workspaceId: data as string };
}
