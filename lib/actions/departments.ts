"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { parseAssigneeKey } from "@/lib/assignee";

export type DepartmentActionResult = { error?: string };

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

// Read (viewing the department grid + detail page) stays open to every
// workspace member per RLS -- only the mutating actions below are gated.
function requireOwnerOrAdmin(role: string): DepartmentActionResult | null {
  if (role !== "owner" && role !== "admin") {
    return { error: "Only owners and admins can manage departments." };
  }
  return null;
}

export async function createDepartment(formData: FormData): Promise<DepartmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const name = String(formData.get("department_name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase.from("departments").insert({
    workspace_id: ctx.workspace.id,
    department_name: name,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/departments");
  return {};
}

export async function renameDepartment(id: string, formData: FormData): Promise<DepartmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const name = String(formData.get("department_name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const { error } = await ctx.supabase
    .from("departments")
    .update({ department_name: name })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/departments");
  revalidatePath(`/dashboard/team/departments/${id}`);
  return {};
}

export async function deleteDepartment(id: string): Promise<DepartmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("departments")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team/departments");
  return {};
}

// `assignee` is the combined "user:<id>" / "directory:<id>" key from
// lib/assignee.ts -- same convention as Tasks/Projects/Deals -- parsed here
// into whichever of the two mutually-exclusive FK columns it belongs in.
export async function addDepartmentMember(
  departmentId: string,
  assignee: string
): Promise<DepartmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const ref = parseAssigneeKey(assignee);
  if (!ref) return { error: "No member selected." };

  const { error } = await ctx.supabase.from("department_members").insert({
    department_id: departmentId,
    workspace_id: ctx.workspace.id,
    user_id: ref.kind === "user" ? ref.id : null,
    team_member_id: ref.kind === "directory" ? ref.id : null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/team/departments/${departmentId}`);
  return {};
}

export async function removeDepartmentMember(
  id: string,
  departmentId: string
): Promise<DepartmentActionResult> {
  const ctx = await requireWorkspace();
  if ("error" in ctx) return ctx;

  const permError = requireOwnerOrAdmin(ctx.workspace.role);
  if (permError) return permError;

  const { error } = await ctx.supabase
    .from("department_members")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/team/departments/${departmentId}`);
  return {};
}
