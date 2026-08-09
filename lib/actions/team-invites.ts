"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { sendInviteEmail } from "@/lib/email";
import type { InvitationRole, WorkspacePermissions } from "@/lib/types";

export type TeamInviteActionResult = { error?: string; emailWarning?: string };
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

function requireOwner(role: string): TeamInviteActionResult | null {
  if (role !== "owner") {
    return { error: "Only the workspace owner can do this." };
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

  const { data: invitation, error } = await ctx.supabase
    .from("invitations")
    .insert({
      workspace_id: ctx.workspace.id,
      email,
      role,
      invited_by: ctx.userId,
    })
    .select("token")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/invites");

  const { data: inviterProfile } = await ctx.supabase
    .from("users")
    .select("full_name")
    .eq("id", ctx.userId)
    .maybeSingle();

  const emailResult = await sendInviteEmail({
    to: email,
    workspaceName: ctx.workspace.name,
    inviterName: inviterProfile?.full_name || "A workspace admin",
    role,
    token: invitation.token,
  });

  if (emailResult.error) {
    console.error("[createInvitation] invite email failed:", emailResult.error);
    return {
      emailWarning:
        "Invite created, but the email couldn't be sent. Copy the link from Pending Invites and share it manually.",
    };
  }

  return {};
}

export async function resendInvitation(id: string): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const { data: invitation, error } = await ctx.supabase
    .from("invitations")
    .update({ expires_at: new Date(Date.now() + INVITE_EXPIRY_MS).toISOString() })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "pending")
    .select("token, email, role, invited_by")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!invitation) return { error: "This invite is no longer pending." };

  revalidatePath("/dashboard/team/invites");

  const { data: inviterProfile } = await ctx.supabase
    .from("users")
    .select("full_name")
    .eq("id", invitation.invited_by ?? ctx.userId)
    .maybeSingle();

  const emailResult = await sendInviteEmail({
    to: invitation.email,
    workspaceName: ctx.workspace.name,
    inviterName: inviterProfile?.full_name || "A workspace admin",
    role: invitation.role,
    token: invitation.token,
  });

  if (emailResult.error) {
    console.error("[resendInvitation] invite email failed:", emailResult.error);
    return {
      emailWarning: "Invite extended, but the email couldn't be resent. Copy the link and share it manually.",
    };
  }

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

  revalidatePath("/dashboard/team/invites");
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

export async function transferOwnership(targetUserId: string): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase.rpc("transfer_workspace_ownership", {
    p_workspace_id: ctx.workspace.id,
    p_target_user_id: targetUserId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return {};
}

export async function updateMemberPermissions(
  targetUserId: string,
  permissions: WorkspacePermissions
): Promise<TeamInviteActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwner(ctx.workspace.role);
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("workspace_members")
    .update({ permissions })
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", targetUserId);

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
  revalidatePath("/dashboard/team/invites");
  return { workspaceId: data as string };
}
