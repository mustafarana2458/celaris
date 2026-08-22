"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getDefaultPermissions, normalizePermissions } from "@/lib/permissions";
import { requirePlanAllowsModule, requireMemberSeatAvailable, isModuleLockedByPlan } from "@/lib/planLimits";
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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  // Seat limit (Solo: owner-only, no additional members) -- checked here,
  // before the invite even exists, so the inviter gets immediate feedback
  // rather than the invitee only discovering it at accept time. Counts
  // real workspace_members rows only (not the team_members directory --
  // see lib/planLimits.ts's comment on why those don't count as seats).
  const seatError = await requireMemberSeatAvailable(ctx.supabase, ctx.workspace);
  if (seatError) return seatError;

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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

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

  const planError = requirePlanAllowsModule(ctx.workspace, "team");
  if (planError) return planError;

  const permError = requireOwner(ctx.workspace.role);
  if (permError) return permError;

  // Re-normalize server-side rather than trusting the client payload as-is --
  // guarantees the stored column always holds a complete, well-formed v2
  // object even if the drawer ever sends a partial/stale shape.
  const { error } = await ctx.supabase
    .from("workspace_members")
    .update({ permissions: normalizePermissions(permissions) })
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

  // Defense-in-depth (Phase 2B): createInvitation() already checked the
  // module lock + seat limit at invite time, but the workspace's plan
  // could have changed in the meantime (e.g. downgraded from Team back to
  // Solo while an invite was still pending) -- re-check against the
  // invitation's actual workspace right before the accept_invitation RPC
  // runs. accept_invitation() itself is an opaque Postgres function (not
  // in this repo) that inserts the workspace_members row internally, so
  // this is the only point in the TS layer where the check can land.
  const { data: invite } = await supabase
    .from("invitations")
    .select("workspace_id")
    .eq("token", token)
    .maybeSingle<{ workspace_id: string }>();

  if (invite) {
    const { data: targetWorkspace } = await supabase
      .from("workspaces")
      .select("id, plan")
      .eq("id", invite.workspace_id)
      .maybeSingle<{ id: string; plan: string | null }>();

    if (targetWorkspace) {
      if (isModuleLockedByPlan(targetWorkspace.plan, "team")) {
        return { error: "This workspace's plan no longer includes Team access." };
      }
      const seatError = await requireMemberSeatAvailable(supabase, { id: targetWorkspace.id, plan: targetWorkspace.plan ?? "free" });
      if (seatError) return seatError;
    }
  }

  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.message };

  const workspaceId = data as string;

  // Apply the role-based default permission baseline (Phase 3) to the
  // membership row the RPC just created. Only touches it when permissions
  // is still unset -- never overwrites an existing grant, and owners
  // (unreachable here since invitations are admin/member only) get no
  // stored baseline at all.
  const { data: memberRow } = await supabase
    .from("workspace_members")
    .select("role, permissions")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberRow && !memberRow.permissions) {
    const baseline = getDefaultPermissions(memberRow.role);
    if (baseline) {
      await supabase
        .from("workspace_members")
        .update({ permissions: baseline })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/team/invites");
  return { workspaceId };
}
