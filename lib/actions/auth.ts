"use server";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  error?: string;
  needsConfirmation?: boolean;
};

function workspaceNameFor(fullName: string, businessName: string) {
  if (businessName) return businessName;
  const firstName = fullName.split(/\s+/)[0] || "My";
  return `${firstName}'s Workspace`;
}

// Shared by the form-based signUp action below and by
// completeSignupProvisioning (called from the client-side signup form, which
// talks to Supabase auth directly for hCaptcha). Creates the profile row, a
// first workspace (falling back to "[First Name]'s Workspace" when no
// business name was given), and the owner membership -- safe to call more
// than once for the same user (unique-violation on re-insert is ignored).
async function provisionUserAndWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
  fullName: string,
  businessName: string
): Promise<AuthActionResult> {
  const { error: profileError } = await supabase.from("users").insert({
    id: user.id,
    full_name: fullName,
    business_name: businessName || null,
    plan: "free",
  });
  // 23505 = unique_violation, safe to ignore (row already exists)
  if (profileError && profileError.code !== "23505") {
    return { error: profileError.message };
  }

  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingMembership) {
    return {};
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: workspaceNameFor(fullName, businessName), owner_id: user.id, plan: "free" })
    .select("id")
    .single();

  if (workspaceError) {
    return { error: workspaceError.message };
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError && memberError.code !== "23505") {
    return { error: memberError.message };
  }

  await supabase.from("users").update({ last_active_workspace_id: workspace.id }).eq("id", user.id);

  return {};
}

// Called by SignupForm right after its client-side supabase.auth.signUp()
// succeeds (that call has to happen client-side to carry the hCaptcha
// token). Reads the just-created session via cookies, so no user id needs to
// come from the client.
export async function completeSignupProvisioning(
  fullName: string,
  businessName: string
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  return provisionUserAndWorkspace(supabase, user, fullName, businessName);
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, business_name: businessName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const result = await provisionUserAndWorkspace(supabase, data.user, fullName, businessName);
    if (result.error) return result;
  }

  if (!data.session) {
    return { needsConfirmation: true };
  }

  redirect("/dashboard");
}

export async function logIn(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (user) {
    // Backfill for accounts that predate the workspace model, or whose
    // signup provisioning failed partway (e.g. the SMTP-confirmation
    // blocker). provisionUserAndWorkspace no-ops each step that's already
    // done, so this is safe (if slightly redundant) to call on every login.
    const meta = (user.user_metadata ?? {}) as {
      full_name?: string;
      business_name?: string;
    };
    await provisionUserAndWorkspace(supabase, user, meta.full_name ?? "", meta.business_name ?? "");
  }

  redirect("/dashboard");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
